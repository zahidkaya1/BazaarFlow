export function getSaleRoundingTargets(
    totalMinor: number,
): number[] {
    if (totalMinor <= 0) {
        return []
    }

    if (totalMinor >= 1000) {
        const nearestFiveMinor =
            Math.floor(
                (totalMinor - 1) /
                500,
            ) * 500

        const nearestTenMinor =
            Math.floor(
                (totalMinor - 1) /
                1000,
            ) * 1000

        const targets = new Set<number>()

        if (
            nearestFiveMinor > 0 &&
            nearestFiveMinor < totalMinor
        ) {
            targets.add(nearestFiveMinor)
        }

        if (
            nearestTenMinor > 0 &&
            nearestTenMinor < totalMinor
        ) {
            targets.add(nearestTenMinor)
        }

        let nextTenMinor =
            nearestTenMinor - 1000

        while (
            targets.size < 3 &&
            nextTenMinor > 0
        ) {
            targets.add(nextTenMinor)
            nextTenMinor -= 1000
        }

        return Array.from(targets)
            .sort(
                (first, second) =>
                    second - first,
            )
            .slice(0, 3)
    }

    const nearestLiraMinor =
        Math.floor(
            (totalMinor - 1) /
            100,
        ) * 100

    return [
        nearestLiraMinor,
        nearestLiraMinor - 100,
        nearestLiraMinor - 200,
    ].filter(
        (target) =>
            target > 0 &&
            target < totalMinor,
    )
}
