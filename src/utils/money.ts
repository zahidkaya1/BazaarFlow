export function parseMoneyToMinor(value: string): number {
    const normalized = value.trim().replace(',', '.')

    if (!/^\d+(\.\d{1,2})?$/.test(normalized)) {
        throw new Error('Geçerli bir fiyat girin. Örnek: 60 veya 60,50')
    }

    const [wholePart, decimalPart = ''] = normalized.split('.')

    const whole = Number(wholePart)
    const decimals = Number(decimalPart.padEnd(2, '0'))

    const minor = whole * 100 + decimals

    if (!Number.isSafeInteger(minor) || minor < 0) {
        throw new Error('Fiyat değeri geçerli değil.')
    }

    return minor
}

export function formatMoneyFromMinor(
    value: number,
    currency = 'TRY',
): string {
    return new Intl.NumberFormat('tr-TR', {
        style: 'currency',
        currency,
    }).format(value / 100)
}