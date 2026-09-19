import Dexie, { type Table } from 'dexie'

import type {
    DataBackupBackendInfo,
    DataBackupEnvelope,
    DataBackupMeta,
} from '../types/dataBackup'

type TauriInvoke = <T>(
    command: string,
    args?: Record<string, unknown>,
) => Promise<T>

type WebDataBackupRow = {
    id: string
    createdAt: string
    origin: string
    envelope: DataBackupEnvelope
}

class BazaarFlowDataBackupDatabase extends Dexie {
    backups!: Table<WebDataBackupRow, string>

    constructor() {
        super('BazaarFlowDataBackupDatabase')

        this.version(1).stores({
            backups: '&id, createdAt, origin',
        })
    }
}

const webDataBackupDb =
    new BazaarFlowDataBackupDatabase()

function getNativeInvoke(): TauriInvoke | null {
    const tauriWindow = window as typeof window & {
        __TAURI__?: {
            core?: {
                invoke?: TauriInvoke
            }
        }
    }

    return tauriWindow.__TAURI__?.core?.invoke ?? null
}

async function saveBackup(
    envelope: DataBackupEnvelope,
): Promise<void> {
    const invoke = getNativeInvoke()

    if (invoke) {
        await invoke('save_data_backup', {
            id: envelope.meta.id,
            contents: JSON.stringify(envelope),
        })

        return
    }

    await webDataBackupDb.backups.put({
        id: envelope.meta.id,
        createdAt: envelope.meta.createdAt,
        origin: envelope.meta.origin,
        envelope,
    })
}

async function listBackups(): Promise<DataBackupMeta[]> {
    const invoke = getNativeInvoke()

    if (invoke) {
        return invoke<DataBackupMeta[]>('list_data_backups')
    }

    const rows = await webDataBackupDb.backups
        .orderBy('createdAt')
        .reverse()
        .toArray()

    return rows.map((row) => row.envelope.meta)
}

async function readBackup(
    id: string,
): Promise<DataBackupEnvelope> {
    const invoke = getNativeInvoke()

    if (invoke) {
        const contents = await invoke<string>(
            'read_data_backup',
            { id },
        )

        return JSON.parse(contents) as DataBackupEnvelope
    }

    const row = await webDataBackupDb.backups.get(id)

    if (!row) {
        throw new Error('Yedek bulunamadı.')
    }

    return row.envelope
}

async function deleteBackup(id: string): Promise<void> {
    const invoke = getNativeInvoke()

    if (invoke) {
        await invoke('delete_data_backup', { id })
        return
    }

    await webDataBackupDb.backups.delete(id)
}

async function exportBackupFile(
    envelope: DataBackupEnvelope,
): Promise<void> {
    const invoke = getNativeInvoke()

    if (invoke) {
        await invoke('export_data_backup', {
            id: envelope.meta.id,
        })
        return
    }

    const json = JSON.stringify(envelope.backup, null, 2)
    const blob = new Blob([json], {
        type: 'application/json;charset=utf-8',
    })
    const url = URL.createObjectURL(blob)
    const anchor = document.createElement('a')
    const safeDate = envelope.meta.createdAt
        .replaceAll(':', '-')
        .replace(/\.\d{3}Z$/, 'Z')

    anchor.href = url
    anchor.download = `bazaarflow-yedek-${safeDate}.json`
    document.body.appendChild(anchor)
    anchor.click()
    anchor.remove()

    window.setTimeout(() => URL.revokeObjectURL(url), 0)
}

async function getBackendInfo(): Promise<DataBackupBackendInfo> {
    const invoke = getNativeInvoke()

    if (invoke) {
        return invoke<DataBackupBackendInfo>(
            'get_data_backup_backend_info',
        )
    }

    return {
        backend: 'web-database',
        canOpenFolder: false,
    }
}

async function openFolder(): Promise<void> {
    const invoke = getNativeInvoke()

    if (!invoke) {
        throw new Error(
            'Tarayıcı sürümünde yedek klasörü doğrudan açılamaz.',
        )
    }

    await invoke('open_data_backup_folder')
}

export const dataBackupStorageService = {
    saveBackup,
    listBackups,
    readBackup,
    deleteBackup,
    exportBackupFile,
    getBackendInfo,
    openFolder,
}
