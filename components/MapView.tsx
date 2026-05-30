'use client'

import { useEffect, useRef } from 'react'
import type { Map as LeafletMap, CircleMarker, Polyline } from 'leaflet'
import type { Position } from '@/lib/types'

interface UserMarker {
  id: string
  color: string
  name: string
  position?: { lat: number; lng: number }
  trail: Position[]
}

interface MapViewProps {
  users: Map<string, UserMarker>
  myId: string
  myPosition: { lat: number; lng: number } | null
  followingUserId: string
  onFollowUser: (userId: string) => void
}

export default function MapView({ users, myId, myPosition, followingUserId, onFollowUser }: MapViewProps) {
  const mapContainerRef = useRef<HTMLDivElement | null>(null)
  const mapRef = useRef<LeafletMap | null>(null)
  const markersRef = useRef<Map<string, CircleMarker>>(new Map())
  const trailsRef = useRef<Map<string, Polyline>>(new Map())

  useEffect(() => {
    if (mapContainerRef.current && !mapRef.current) {
      const initMap = async () => {
        const L = await import('leaflet')
        const map = L.map(mapContainerRef.current!, {
          zoomControl: true,
          attributionControl: true,
        }).setView([20, 0], 2)

        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
          attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
          maxZoom: 19,
        }).addTo(map)

        mapRef.current = map
      }
      initMap()
    }

    return () => {
      if (mapRef.current) {
        mapRef.current.remove()
        mapRef.current = null
      }
    }
  }, [])

  useEffect(() => {
    if (!mapRef.current) return

    const map = mapRef.current!

    if (followingUserId === 'self' && myPosition) {
      map.setView([myPosition.lat, myPosition.lng], map.getZoom(), {
        animate: true,
        duration: 0.3,
      })
    } else if (followingUserId && followingUserId !== 'self') {
      const target = users.get(followingUserId)
      if (target?.position) {
        map.setView([target.position.lat, target.position.lng], map.getZoom(), {
          animate: true,
          duration: 0.3,
        })
      }
    }
  }, [myPosition, followingUserId, users])

  useEffect(() => {
    if (!mapRef.current) return

    const updateMarkers = async () => {
      const L = await import('leaflet')
      const map = mapRef.current!
      const markers = markersRef.current
      const trailLines = trailsRef.current

      users.forEach((user) => {
        if (user.id === myId) return

        if (user.position) {
          if (markers.has(user.id)) {
            markers.get(user.id)!.setLatLng([user.position.lat, user.position.lng])
          } else {
            const isFollowed = followingUserId === user.id
            const marker = L.circleMarker([user.position.lat, user.position.lng], {
              radius: isFollowed ? 12 : 8,
              fillColor: user.color,
              color: '#ffffff',
              weight: isFollowed ? 3 : 2,
              opacity: 1,
              fillOpacity: 0.9,
            }).addTo(map)

            marker.bindTooltip(user.name, {
              permanent: false,
              direction: 'top',
              offset: L.point(0, -10),
            })

            marker.on('click', () => {
              onFollowUser(user.id)
            })

            markers.set(user.id, marker)
          }
        }

        if (user.trail.length > 1) {
          const trailLatLngs = user.trail.map(p => [p.lat, p.lng] as [number, number])

          if (trailLines.has(user.id)) {
            trailLines.get(user.id)!.setLatLngs(trailLatLngs)
          } else {
            const polyline = L.polyline(trailLatLngs, {
              color: user.color,
              weight: 3,
              opacity: 0.7,
              dashArray: '8, 8',
            }).addTo(map)

            trailLines.set(user.id, polyline)
          }
        }
      })

      markers.forEach((_, userId) => {
        if (userId === myId) return
        if (!users.has(userId)) {
          map.removeLayer(markers.get(userId)!)
          markers.delete(userId)
        }
      })
      trailLines.forEach((_, userId) => {
        if (userId === myId) return
        if (!users.has(userId)) {
          map.removeLayer(trailLines.get(userId)!)
          trailLines.delete(userId)
        }
      })
    }

    updateMarkers()
  }, [users, myId, followingUserId, onFollowUser])

  return (
    <div className="map-container">
      <div ref={mapContainerRef} id="map" />
    </div>
  )
}
