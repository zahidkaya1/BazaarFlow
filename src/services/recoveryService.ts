import type { BazaarFlowBackup } from '../types/backup'
import type {
    RecoveryPointEnvelope,
    RecoveryPointKind,
    RecoveryPointMeta,
} from '../types/recovery'
import { createId } from '../utils/createId'
import { backupService } from './backupService'
import { recoveryStorageService } from './recoveryStorageService'

const AUTO_LIMIT = 6
const HOURLY_LIMIT = 6
const DAILY_LIMIT = 7
const ACTION_LIMIT = 8
const BEFORE_RESTORE_LIMIT = 2
const MANUAL_LIMIT = 3
const IMPORTED_LIMIT = 5

const MAX_POINT_COUNT = 30
const MAX_STORAGE_BYTES = 100 * 1024 * 1024

const KIND_LIMITS: Record<RecoveryPointKind, number> = {
    automatic: AUTO_LIMIT,
    hourly: HOURLY_LIMIT,
    daily: DAILY_LIMIT,
    action: ACTION_LIMIT,
    before_restore: BEFORE_RESTORE_LIMIT,
    manual: MANUAL_LIMIT,
    imported: IMPORTED_LIMIT,
}

const DELETE_PRIORITY: Record<RecoveryPointKind, number> = {
    automatic: 0,
    hourly: 1,
    daily: 2,
    action: 3,
    before_restore: 4,
    manual: 5,
    imported: 6,
}

function simpleHash(value: string): string {
    let hash = 2166136261

    for (let index = 0; index < value.length; index += 1) {
        hash ^= value.charCodeAt(index)
        hash = Math.imul(hash, 16777619)
    }

    return (hash >>> 0)
        .toString(16)
        .padStart(8, '0')
}

function getBackupChecksum(backup: BazaarFlowBackup): string {
    return simpleHash(JSON.stringify(backup.data))
}

function getLocalDayKey(value: string): string {
    const date = new Date(value)

    return [
        date.getFullYear(),
        String(date.getMonth() + 1).padStart(2, '0'),
        String(date.getDate()).padStart(2, '0'),
    ].join('-')
}

function getLocalHourKey(value: string): string {
    const date = new Date(value)

    return `${getLocalDayKey(value)}-${String(
        date.getHours(),
    ).padStart(2, '0')}`
}

function getKindReason(kind: RecoveryPointKind): string {
    switch (kind) {
        case 'automatic':
        case 'hourly':
            return 'Otomatik kayıt'
        case 'daily':
            return 'Günlük kayıt'
        case 'manual':
            return 'Manuel kayıt'
        case 'before_restore':
            return 'Geri yüklemeden önce'
        case 'imported':
            return 'İçe aktarılan kayıt'
        case 'action':
            return 'İşlemden önce'
    }
}

async function prunePoints(): Promise<void> {
    const points =
        (await recoveryStorageService.listPoints())
            .sort(
                (a, b) =>
                    Date.parse(b.createdAt) -
                    Date.parse(a.createdAt),
            )

    const deleteIds = new Set<string>()

    for (
        const kind of Object.keys(
            KIND_LIMITS,
        ) as RecoveryPointKind[]
    ) {
        const matches = points.filter(
            (point) => point.kind === kind,
        )

        for (
            let index = KIND_LIMITS[kind];
            index < matches.length;
            index += 1
        ) {
            deleteIds.add(matches[index]!.id)
        }
    }

    let remaining = points.filter(
        (point) => !deleteIds.has(point.id),
    )

    function getTotalBytes() {
        return remaining.reduce(
            (total, point) => total + point.byteSize,
            0,
        )
    }

    while (
        remaining.length > MAX_POINT_COUNT ||
        getTotalBytes() > MAX_STORAGE_BYTES
    ) {
        const candidate = [...remaining]
            .sort((a, b) => {
                const priorityDifference =
                    DELETE_PRIORITY[a.kind] -
                    DELETE_PRIORITY[b.kind]

                if (priorityDifference !== 0) {
                    return priorityDifference
                }

                return (
                    Date.parse(a.createdAt) -
                    Date.parse(b.createdAt)
                )
            })[0]

        if (!candidate) {
            break
        }

        deleteIds.add(candidate.id)
        remaining = remaining.filter(
            (point) => point.id !== candidate.id,
        )
    }

    await Promise.all(
        Array.from(deleteIds).map((id) =>
            recoveryStorageService.deletePoint(id),
        ),
    )
}

type CreatePointOptions = {
    force?: boolean
    backup?: BazaarFlowBackup
    createdAt?: string
}

async function createPoint(
    kind: RecoveryPointKind,
    reason = getKindReason(kind),
    options: CreatePointOptions = {},
): Promise<RecoveryPointMeta | null> {
    const backup =
        options.backup ??
        await backupService.createBackup()

    const checksum = getBackupChecksum(backup)
    const existing =
        await recoveryStorageService.listPoints()

    const latest = existing
        .sort(
            (a, b) =>
                Date.parse(b.createdAt) -
                Date.parse(a.createdAt),
        )[0]

    if (
        !options.force &&
        latest?.checksum === checksum
    ) {
        return null
    }

    const createdAt =
        options.createdAt ?? new Date().toISOString()

    const id = `${createdAt.replaceAll(':', '-')}-${kind}-${createId()}`

    const envelopeWithoutSize = {
        meta: {
            id,
            createdAt,
            kind,
            reason,
            checksum,
            appVersion: '0.1.0',
            databaseVersion: backup.databaseVersion,
            byteSize: 0,
        },
        backup,
    } satisfies RecoveryPointEnvelope

    const json = JSON.stringify(envelopeWithoutSize)
    const byteSize = new Blob([json]).size

    const envelope: RecoveryPointEnvelope = {
        ...envelopeWithoutSize,
        meta: {
            ...envelopeWithoutSize.meta,
            byteSize,
        },
    }

    await recoveryStorageService.savePoint(envelope)
    await prunePoints()

    return envelope.meta
}

async function createScheduledPoint(): Promise<RecoveryPointMeta | null> {
    const points =
        await recoveryStorageService.listPoints()

    const now = new Date().toISOString()
    const todayKey = getLocalDayKey(now)
    const hourKey = getLocalHourKey(now)

    const hasDailyToday = points.some(
        (point) =>
            point.kind === 'daily' &&
            getLocalDayKey(point.createdAt) === todayKey,
    )

    if (!hasDailyToday) {
        return createPoint('daily')
    }

    const hasHourlyThisHour = points.some(
        (point) =>
            point.kind === 'hourly' &&
            getLocalHourKey(point.createdAt) === hourKey,
    )

    if (!hasHourlyThisHour) {
        return createPoint('hourly')
    }

    return createPoint('automatic')
}

async function createActionPoint(
    reason: string,
): Promise<RecoveryPointMeta | null> {
    return createPoint(
        'action',
        reason,
        { force: true },
    )
}

async function createManualPoint(): Promise<RecoveryPointMeta | null> {
    return createPoint(
        'manual',
        getKindReason('manual'),
        { force: true },
    )
}

async function restoreBackupSafely(
    backup: BazaarFlowBackup,
): Promise<void> {
    await createPoint(
        'before_restore',
        getKindReason('before_restore'),
        { force: true },
    )

    await backupService.restoreBackup(backup)
}

async function restorePoint(id: string): Promise<void> {
    const point =
        await recoveryStorageService.readPoint(id)

    await restoreBackupSafely(point.backup)
}

export const recoveryService = {
    listPoints: recoveryStorageService.listPoints,
    getBackendInfo: recoveryStorageService.getBackendInfo,
    openFolder: recoveryStorageService.openFolder,
    createScheduledPoint,
    createActionPoint,
    createManualPoint,
    restoreBackupSafely,
    restorePoint,
}
