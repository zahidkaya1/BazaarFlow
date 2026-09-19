import { useEffect } from 'react'

import { recoveryService } from '../../services/recoveryService'

const INTERVAL_MS = 10 * 60 * 1000

function RecoveryScheduler() {
    useEffect(() => {
        let disposed = false
        let lastRunAt = 0

        async function run() {
            if (disposed) {
                return
            }

            const now = Date.now()

            if (
                now - lastRunAt <
                INTERVAL_MS - 5_000
            ) {
                return
            }

            lastRunAt = now

            try {
                await recoveryService.createScheduledPoint()
            } catch (error) {
                console.warn(
                    'BazaarFlow otomatik kurtarma noktası oluşturulamadı.',
                    error,
                )
            }
        }

        const initialTimer = window.setTimeout(
            () => {
                void run()
            },
            3_000,
        )

        const interval = window.setInterval(
            () => {
                void run()
            },
            INTERVAL_MS,
        )

        function handleVisibilityChange() {
            if (
                document.visibilityState ===
                'visible'
            ) {
                void run()
            }
        }

        document.addEventListener(
            'visibilitychange',
            handleVisibilityChange,
        )

        return () => {
            disposed = true
            window.clearTimeout(initialTimer)
            window.clearInterval(interval)
            document.removeEventListener(
                'visibilitychange',
                handleVisibilityChange,
            )
        }
    }, [])

    return null
}

export default RecoveryScheduler
