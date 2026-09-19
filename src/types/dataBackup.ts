import type { BazaarFlowBackup } from './backup'

export type DataBackupOrigin = 'created' | 'imported'

export type DataBackupMeta = {
    id: string
    createdAt: string
    origin: DataBackupOrigin
    byteSize: number
}

export type DataBackupEnvelope = {
    meta: DataBackupMeta
    backup: BazaarFlowBackup
}

export type DataBackupBackendInfo = {
    backend: 'native-files' | 'web-database'
    canOpenFolder: boolean
}
