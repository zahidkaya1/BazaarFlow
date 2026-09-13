export function formatDateValue(
    date: Date,
): string {
    const year = date.getFullYear()
    const month = String(
        date.getMonth() + 1,
    ).padStart(2, '0')
    const day = String(
        date.getDate(),
    ).padStart(2, '0')

    return `${year}-${month}-${day}`
}

export function getTodayDateValue(): string {
    return formatDateValue(
        new Date(),
    )
}

export function formatDisplayDate(
    value: string,
): string {
    const [year, month, day] =
        value.split('-')

    return `${day}.${month}.${year}`
}
