import { useEffect } from 'react'

import { webExperienceService } from '../../services/webExperienceService'

function WebExperienceController() {
  useEffect(() => {
    const stopWatching = webExperienceService.watch()
    void webExperienceService.registerServiceWorker()

    return stopWatching
  }, [])

  return null
}

export default WebExperienceController
