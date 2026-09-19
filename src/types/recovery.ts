import type { BazaarFlowBackup } from './backup'

export type RecoveryPointKind =
    | 'automatic'
    | 'hourly'
    | 'daily'
    | 'action'
    | 'manual'
    | 'before_restore'
    | 'imported'

export type RecoveryPointMeta = {
    id: string
    createdAt: string
    kind: RecoveryPointKind
    reason: string
    checksum: string
    appVersion: string
    databaseVersion: number
    byteSize: number
}

export type RecoveryPointEnvelope = {
    meta: RecoveryPointMeta
    backup: BazaarFlowBackup
}

export type RecoveryBackendInfo = {
    backend: 'native-files' | 'web-database'
    canOpenFolder: boolean
    locationLabel: string
}
