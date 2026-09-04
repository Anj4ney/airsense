import { useCallback, useRef, useState } from 'react';

/**
 * useGeolocation — wraps navigator.geolocation with friendly states.
 * status: 'idle' | 'prompting' | 'granted' | 'denied' | 'timeout' | 'error' | 'unsupported'
 */

const GEO_OPTIONS = {
  enableHighAccuracy: false,
  timeout: 10000,
  maximumAge: 5 * 60 * 1000, // a 5-minute-old fix is fine for weather
};

function friendlyError(err) {
  if (!err) return 'Location unavailable.';
  switch (err.code) {
    case err.PERMISSION_DENIED:
      return 'Location permission was denied.';
    case err.TIMEOUT:
      return 'Location request timed out.';
    case err.POSITION_UNAVAILABLE:
      return 'Your position could not be determined.';
    default:
      return 'Location unavailable.';
  }
}

export function useGeolocation() {
  const [state, setState] = useState({ status: 'idle', coords: null, error: null });
  const reqId = useRef(0);

  const request = useCallback(() => {
    if (typeof navigator === 'undefined' || !('geolocation' in navigator)) {
      setState({ status: 'unsupported', coords: null, error: 'Geolocation is not supported by this browser.' });
      return;
    }
    const id = ++reqId.current;
    setState((s) => ({ ...s, status: 'prompting', error: null }));
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        if (reqId.current !== id) return;
        setState({
          status: 'granted',
          coords: { lat: pos.coords.latitude, lon: pos.coords.longitude },
          error: null,
        });
      },
      (err) => {
        if (reqId.current !== id) return;
        const status =
          err && err.code === err.PERMISSION_DENIED
            ? 'denied'
            : err && err.code === err.TIMEOUT
              ? 'timeout'
              : 'error';
        setState({ status, coords: null, error: friendlyError(err) });
      },
      GEO_OPTIONS
    );
  }, []);

  return { ...state, request };
}
