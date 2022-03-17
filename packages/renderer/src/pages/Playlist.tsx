import React, { Fragment, memo } from 'react'
import Button, { Color as ButtonColor } from '@/components/Button'
import Skeleton from '@/components/Skeleton'
import SvgIcon from '@/components/SvgIcon'
import TracksList from '@/components/TracksList'
import usePlaylist from '@/hooks/usePlaylist'
import useScroll from '@/hooks/useScroll'
import useTracksInfinite from '@/hooks/useTracksInfinite'
import { player } from '@/store'
import { formatDate, resizeImage } from '@/utils/common'

const enableRenderLog = true

const Header = memo(
  ({
    playlist,
    isLoading,
    handlePlay,
  }: {
    playlist: Playlist | undefined
    isLoading: boolean
    handlePlay: () => void
  }) => {
    if (enableRenderLog) console.debug('Rendering Playlist.tsx Header')
    const coverUrl = resizeImage(playlist?.coverImgUrl || '', 'lg')

    return (
      <Fragment>
        {/* Header background */}
        <div className='absolute top-0 left-0 z-0 h-[24rem] w-full overflow-hidden'>
          <img src={coverUrl} className='absolute top-0 w-full blur-[100px]' />
          <img src={coverUrl} className='absolute top-0 w-full blur-[100px]' />
          <div className='absolute top-0 h-full w-full bg-gradient-to-b from-white/[.84] to-white dark:from-black/[.5] dark:to-[#1d1d1d]'></div>
        </div>

        <div className='grid grid-cols-[16rem_auto] items-center gap-9'>
          {/*  Cover */}
          <div className='relative z-0 aspect-square self-start'>
            {!isLoading && (
              <div
                className='absolute top-3.5 z-[-1] h-full w-full scale-x-[.92] scale-y-[.96] rounded-2xl bg-cover opacity-40 blur-lg filter'
                style={{
                  backgroundImage: `url("${coverUrl}")`,
                }}
              ></div>
            )}

            {!isLoading && (
              <img
                src={coverUrl}
                className='rounded-2xl border border-black border-opacity-5'
              />
            )}
            {isLoading && (
              <Skeleton v-else className='h-full w-full rounded-2xl' />
            )}
          </div>

          {/* <!-- Playlist info --> */}
          <div className='z-10 flex h-full flex-col justify-between'>
            {/* <!-- Playlist name --> */}
            {!isLoading && (
              <div className='text-4xl font-bold dark:text-white'>
                {playlist?.name}
              </div>
            )}
            {isLoading && (
              <Skeleton v-else className='w-3/4 text-4xl'>
                PLACEHOLDER
              </Skeleton>
            )}

            {/* <!-- Playlist creator --> */}
            {!isLoading && (
              <div className='mt-5 text-lg font-medium text-gray-800 dark:text-gray-300'>
                Playlist by <span>{playlist?.creator?.nickname}</span>
              </div>
            )}
            {isLoading && (
              <Skeleton v-else className='mt-5 w-64 text-lg'>
                PLACEHOLDER
              </Skeleton>
            )}

            {/* <!-- Playlist last update time & track count --> */}
            {!isLoading && (
              <div className='text-sm font-thin text-gray-500 dark:text-gray-400'>
                Updated at
                {formatDate(playlist?.updateTime || 0, 'en')} ·
                {playlist?.trackCount} Songs
              </div>
            )}
            {isLoading && (
              <Skeleton v-else className='w-72 translate-y-px text-sm'>
                PLACEHOLDER
              </Skeleton>
            )}

            {/* <!-- Playlist description --> */}
            {!isLoading && (
              <div className='line-clamp-2 mt-5 min-h-[2.5rem] text-sm text-gray-500 dark:text-gray-400'>
                {playlist?.description}
              </div>
            )}
            {isLoading && (
              <Skeleton v-else className='mt-5 min-h-[2.5rem] w-1/2 text-sm'>
                PLACEHOLDER
              </Skeleton>
            )}

            {/* <!-- Buttons --> */}
            <div className='mt-5 flex gap-4'>
              <Button onClick={() => handlePlay()} isSkelton={isLoading}>
                <SvgIcon name='play' className='mr-2 h-4 w-4' />
                PLAY
              </Button>

              <Button
                color={ButtonColor.Gray}
                isSkelton={isLoading}
                onClick={() => toast('Work in progress')}
              >
                <SvgIcon name='heart' className='h-4 w-4' />
              </Button>

              <Button
                color={ButtonColor.Gray}
                iconColor={ButtonColor.Gray}
                isSkelton={isLoading}
                onClick={() => toast('Work in progress')}
              >
                <SvgIcon name='more' className='h-4 w-4' />
              </Button>
            </div>
          </div>
        </div>
      </Fragment>
    )
  }
)
Header.displayName = 'Header'

const Tracks = memo(
  ({
    playlist,
    handlePlay,
    isLoadingPlaylist,
  }: {
    playlist: Playlist | undefined
    handlePlay: (trackID: number | null) => void
    isLoadingPlaylist: boolean
  }) => {
    if (enableRenderLog) console.debug('Rendering Playlist.tsx Tracks')

    const {
      data: tracksPages,
      hasNextPage,
      isLoading: isLoadingTracks,
      isFetchingNextPage,
      fetchNextPage,
    } = useTracksInfinite({
      ids: playlist?.trackIds?.map(t => t.id) || [],
    })

    const scroll = useScroll(document.getElementById('mainContainer'), {
      throttle: 500,
      offset: {
        bottom: 256,
      },
    })

    useEffect(() => {
      if (!scroll.arrivedState.bottom || !hasNextPage || isFetchingNextPage)
        return
      fetchNextPage()
    }, [
      fetchNextPage,
      hasNextPage,
      isFetchingNextPage,
      scroll.arrivedState.bottom,
    ])

    const tracks = useMemo(() => {
      if (!tracksPages) return []
      const allTracks: Track[] = []
      tracksPages.pages.forEach(page => allTracks.push(...(page?.songs ?? [])))
      return allTracks
    }, [tracksPages])

    return (
      <Fragment>
        {isLoadingPlaylist ? (
          <TracksList tracks={[]} isSkeleton={true} />
        ) : isLoadingTracks ? (
          <TracksList
            tracks={playlist?.tracks ?? []}
            onTrackDoubleClick={handlePlay}
          />
        ) : (
          <TracksList tracks={tracks} onTrackDoubleClick={handlePlay} />
        )}
      </Fragment>
    )
  }
)
Tracks.displayName = 'Tracks'

const Playlist = () => {
  if (enableRenderLog) console.debug('Rendering Playlist.tsx Playlist')

  const params = useParams()
  const { data: playlist, isLoading } = usePlaylist({
    id: Number(params.id) || 0,
  })

  const handlePlay = useCallback(
    (trackID: number | null = null) => {
      if (!playlist) {
        toast('Failed to play playlist')
        return
      }
      player.playPlaylist(playlist.playlist, trackID)
    },
    [playlist]
  )

  return (
    <div className='mt-10'>
      <Header
        playlist={playlist?.playlist}
        isLoading={isLoading}
        handlePlay={handlePlay}
      />

      <Tracks
        playlist={playlist?.playlist}
        handlePlay={handlePlay}
        isLoadingPlaylist={isLoading}
      />
    </div>
  )
}

export default Playlist
