type MobilePageHeaderProps = {
    title: string
}

function MobilePageHeader({ title }: MobilePageHeaderProps) {
    return (
        <header className="mobile-page-header">
            <h1>{title}</h1>
        </header>
    )
}

export default MobilePageHeader
