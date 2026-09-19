import Dexie, { type Table } from 'dexie'

import type {
    RecoveryBackendInfo,
    RecoveryPointEnvelope,
    RecoveryPointMeta,
} from '../types/recovery'

type TauriInvoke = <T>(
    command: string,
    args?: Record<string, unknown>,
) => Promise<T>

type TauriGlobal = {
    core?: {
        invoke?: TauriInvoke
    }
}

declare global {
    interface Window {
        __TAURI__?: TauriGlobal
    }
}

type WebRecoveryRow = {
    id: string
    createdAt: string
    kind: string
    envelope: RecoveryPointEnvelope
}

class BazaarFlowRecoveryDatabase extends Dexie {
    points!: Table<WebRecoveryRow, string>

    constructor() {
        super('BazaarFlowRecoveryDatabase')

        this.version(1).stores({
            points: '&id, createdAt, kind',
        })
    }
}

const webRecoveryDb =
    new BazaarFlowRecoveryDatabase()

function getNativeInvoke(): TauriInvoke | null {
    return window.__TAURI__?.core?.invoke ?? null
}

async function savePoint(
    envelope: RecoveryPointEnvelope,
): Promise<void> {
    const invoke = getNativeInvoke()

    if (invoke) {
        await invoke('save_recovery_point', {
            id: envelope.meta.id,
            contents: JSON.stringify(envelope),
        })

        return
    }

    await webRecoveryDb.points.put({
        id: envelope.meta.id,
        createdAt: envelope.meta.createdAt,
        kind: envelope.meta.kind,
        envelope,
    })
}

async function listPoints(): Promise<RecoveryPointMeta[]> {
    const invoke = getNativeInvoke()

    if (invoke) {
        return invoke<RecoveryPointMeta[]>(
            'list_recovery_points',
        )
    }

    const rows =
        await webRecoveryDb.points
            .orderBy('createdAt')
            .reverse()
            .toArray()

    return rows.map((row) => row.envelope.meta)
}

async function readPoint(
    id: string,
): Promise<RecoveryPointEnvelope> {
    const invoke = getNativeInvoke()

    if (invoke) {
        const contents = await invoke<string>(
            'read_recovery_point',
            { id },
        )

        return JSON.parse(
            contents,
        ) as RecoveryPointEnvelope
    }

    const row =
        await webRecoveryDb.points.get(id)

    if (!row) {
        throw new Error(
            'Geri alma noktası bulunamadı.',
        )
    }

    return row.envelope
}

async function deletePoint(
    id: string,
): Promise<void> {
    const invoke = getNativeInvoke()

    if (invoke) {
        await invoke('delete_recovery_point', {
            id,
        })
        return
    }

    await webRecoveryDb.points.delete(id)
}

async function getBackendInfo(): Promise<RecoveryBackendInfo> {
    const invoke = getNativeInvoke()

    if (invoke) {
        return invoke<RecoveryBackendInfo>(
            'get_recovery_backend_info',
        )
    }

    return {
        backend: 'web-database',
        canOpenFolder: false,
        locationLabel:
            'Tarayıcıdaki özel BazaarFlow kurtarma alanı',
    }
}

async function openFolder(): Promise<void> {
    const invoke = getNativeInvoke()

    if (!invoke) {
        throw new Error(
            'Tarayıcı sürümünde kurtarma klasörü doğrudan açılamaz.',
        )
    }

    await invoke('open_recovery_folder')
}

export const recoveryStorageService = {
    savePoint,
    listPoints,
    readPoint,
    deletePoint,
    getBackendInfo,
    openFolder,
}
