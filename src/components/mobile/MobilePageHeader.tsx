type MobilePageHeaderProps = {
    title: string
    description?: string
}

function MobilePageHeader({
    title,
    description,
}: MobilePageHeaderProps) {
    return (
        <header className="mobile-page-header">
            <span className="page-eyebrow">
                BazaarFlow
            </span>

            <h1>{title}</h1>

            {description && (
                <p>{description}</p>
            )}
        </header>
    )
}

export default MobilePageHeader
