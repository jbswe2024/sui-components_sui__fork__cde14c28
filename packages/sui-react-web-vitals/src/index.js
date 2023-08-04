import {useContext, useEffect, useRef} from 'react'

import PropTypes from 'prop-types'
import * as reporter from 'web-vitals/attribution'

import SUIContext from '@s-ui/react-context'
import useMount from '@s-ui/react-hooks/lib/useMount/index.js'
import {useRouter} from '@s-ui/react-router'

export const METRICS = {
  TTFB: 'TTFB',
  LCP: 'LCP',
  CLS: 'CLS',
  FID: 'FID',
  INP: 'INP',
  FCP: 'FCP'
}

const DEFAULT_METRICS_REPORTING_ALL_CHANGES = [METRICS.LCP, METRICS.INP]

const DEFAULT_CWV_THRESHOLDS = {
  [METRICS.LCP]: 2500,
  [METRICS.INP]: 200
}

export const DEVICE_TYPES = {
  DESKTOP: 'desktop',
  TABLET: 'tablet',
  MOBILE: 'mobile'
}

const getNormalizedPathname = pathname => {
  return pathname.replaceAll('*', '_')
}

export default function WebVitalsReporter({
  cwvThresholds = DEFAULT_CWV_THRESHOLDS,
  deviceType,
  metrics = Object.values(METRICS),
  metricsAllChanges = DEFAULT_METRICS_REPORTING_ALL_CHANGES,
  onReport,
  pathnames,
  children
}) {
  const {logger, browser} = useContext(SUIContext)
  const router = useRouter()
  const onReportRef = useRef(onReport)

  useEffect(() => {
    onReportRef.current = onReport
  }, [onReport])

  useMount(() => {
    const getPathname = () => {
      const {routes} = router
      const route = routes[routes.length - 1]
      return route?.path || route?.regexp?.toString()
    }

    const getRouteid = () => {
      const {routes} = router
      const route = routes[routes.length - 1]
      return route?.id
    }

    const getDeviceType = () => {
      return deviceType || browser?.deviceType
    }

    const handleAllChanges = ({attribution, name, value}) => {
      const pathname = getPathname()
      const routeid = getRouteid()
      const type = getDeviceType()
      const {eventTarget} = attribution || {}
      const isExcluded =
        !pathname || (Array.isArray(pathnames) && !pathnames.includes(pathname))

      if (isExcluded) return

      const amount = name === METRICS.CLS ? value * 1000 : value

      if (amount < cwvThresholds[name]) return

      logger.metric({
        label: `cwv|${name.toLowerCase()}|${routeid}|${type}`,
        message: `${amount}|${eventTarget}`
      })
    }

    const handleChange = ({name, value}) => {
      const onReport = onReportRef.current
      const pathname = getPathname()
      const routeid = getRouteid()
      const type = getDeviceType()
      const isExcluded =
        !pathname || (Array.isArray(pathnames) && !pathnames.includes(pathname))

      if (isExcluded) return

      if (onReport) {
        onReport({
          name,
          amount: value,
          pathname,
          routeid,
          type
        })
        return
      }

      if (!logger?.distribution) {
        return
      }

      const amount = name === METRICS.CLS ? value * 1000 : value

      logger.distribution({
        name: 'cwv',
        amount,
        tags: [
          {
            key: 'name',
            value: name.toLowerCase()
          },
          {
            key: 'pathname',
            value: getNormalizedPathname(pathname)
          },
          ...(routeid
            ? [
                {
                  key: 'routeid',
                  value: routeid
                }
              ]
            : []),
          ...(type
            ? [
                {
                  key: 'type',
                  value: type
                }
              ]
            : [])
        ]
      })
    }

    metrics.forEach(metric => {
      reporter[`on${metric}`](handleChange)
      if (DEFAULT_METRICS_REPORTING_ALL_CHANGES.includes(metric))
        reporter[`on${metric}`](handleAllChanges, {reportAllChanges: true})
    })
  })

  return children
}

WebVitalsReporter.propTypes = {
  /**
   * An object with METRICS as keys and thresholds as values
   * Thresholds by default are those above which Google considers the page as "needs improvement"
   * Lower thresholds could be set for fine-tuning, higher thresholds could be set for less noise when reporting all changes
   */
  cwvThresholds: PropTypes.object,
  /**
   * An optional string to identify the device type. Choose between: desktop, tablet and mobile
   */
  deviceType: PropTypes.oneOf(Object.values(DEVICE_TYPES)),
  /**
   * An optional array of core web vitals. Choose between: TTFB, LCP, FID, CLS and INP. Defaults to all.
   */
  metrics: PropTypes.arrayOf(PropTypes.oneOf(Object.values(METRICS))),
  /**
   * An optional array of core web vitals. Choose between: TTFB, LCP, FID, CLS and INP. Defaults to LCP and INP.
   */
  metricsAllChanges: PropTypes.arrayOf(PropTypes.oneOf(Object.values(METRICS))),
  /**
   * An optional array of pathnames that you want to track
   */
  pathnames: PropTypes.arrayOf(PropTypes.string),
  /**
   * An optional callback to be used to track core web vitals
   */
  onReport: PropTypes.func,
  /**
   * An optional children node
   */
  children: PropTypes.node
}
