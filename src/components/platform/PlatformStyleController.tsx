import { useEffect } from 'react'

import { platformUiService } from '../../services/platformUiService'

function PlatformStyleController() {
    useEffect(
        () => platformUiService.watch(),
        [],
    )

    return null
}

export default PlatformStyleController
