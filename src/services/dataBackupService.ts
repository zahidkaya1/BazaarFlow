import type { BazaarFlowBackup } from '../types/backup'
import type {
    DataBackupEnvelope,
    DataBackupMeta,
    DataBackupOrigin,
} from '../types/dataBackup'
import { createId } from '../utils/createId'
import { backupService } from './backupService'
import { dataBackupStorageService } from './dataBackupStorageService'
import { recoveryService } from './recoveryService'

function createEnvelope(
    backup: BazaarFlowBackup,
    origin: DataBackupOrigin,
): DataBackupEnvelope {
    const createdAt = backup.exportedAt
    const id = `${createdAt.replaceAll(':', '-')}-backup-${createId()}`

    const withoutSize: DataBackupEnvelope = {
        meta: {
            id,
            createdAt,
            origin,
            byteSize: 0,
        },
        backup,
    }

    const byteSize = new Blob([
        JSON.stringify(withoutSize),
    ]).size

    return {
        ...withoutSize,
        meta: {
            ...withoutSize.meta,
            byteSize,
        },
    }
}

async function createBackup(): Promise<DataBackupMeta> {
    const backup = await backupService.createBackup()
    const envelope = createEnvelope(backup, 'created')

    await dataBackupStorageService.saveBackup(envelope)

    return envelope.meta
}

async function importBackup(
    backup: BazaarFlowBackup,
): Promise<DataBackupMeta> {
    const envelope = createEnvelope(backup, 'imported')

    await dataBackupStorageService.saveBackup(envelope)

    return envelope.meta
}

async function restoreBackup(id: string): Promise<void> {
    const envelope = await dataBackupStorageService.readBackup(id)

    await recoveryService.restoreBackupSafely(envelope.backup)
}

async function exportBackup(id: string): Promise<void> {
    const envelope = await dataBackupStorageService.readBackup(id)

    await dataBackupStorageService.exportBackupFile(envelope)
}

export const dataBackupService = {
    listBackups: dataBackupStorageService.listBackups,
    getBackendInfo: dataBackupStorageService.getBackendInfo,
    openFolder: dataBackupStorageService.openFolder,
    createBackup,
    importBackup,
    restoreBackup,
    exportBackup,
    deleteBackup: dataBackupStorageService.deleteBackup,
}
