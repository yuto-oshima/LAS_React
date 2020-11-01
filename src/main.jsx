import React, { Fragment, useEffect, useState } from 'react'
import { LASLoader, LASWorkerLoader } from '@loaders.gl/las'
import { load, registerLoaders } from '@loaders.gl/core'
import DeckGL from '@deck.gl/react'
import { COORDINATE_SYSTEM, OrbitView, LinearInterpolator } from '@deck.gl/core'
import { PointCloudLayer } from '@deck.gl/layers'

/*
const calculateBounds = attributes => {
  const mins = [Number.MAX_VALUE, Number.MAX_VALUE, Number.MAX_VALUE]
  const maxs = [Number.MIN_VALUE, Number.MIN_VALUE, Number.MIN_VALUE]
  
  const pointSize = attributes.POSITION.size
  const pointCount = attributes.POSITION.value.length / pointSize
  
  for (let i = 0; i < pointCount; i += pointSize) {
    const x = attributes.POSITION.value[i]
    const y = attributes.POSITION.value[i + 1]
    const z = attributes.POSITION.value[i + 2]
    
    if (x < mins[0]) mins[0] = x
    else if (x > maxs[0]) maxs[0] = x
    
    if (y < mins[1]) mins[1] = y
    else if (y > maxs[1]) maxs[1] = y
    
    if (z < mins[2]) mins[2] = z
    else if (z > maxs[2]) maxs[2] = z
  }
  
  return { mins, maxs }
}
*/

const transitionInterpolator = new LinearInterpolator(['rotationOrbit'])

const Main = props => {
  
  const INITIAL_VIEW_STATE = {
    target: [0, 0, 0],
    rotationX: 0,
    rotationOrbit: 0,
    orbitAxis: 'Y',
    fov: 50,
    minZoom: 0,
    maxZoom: 10,
    zoom: 1
  }

  const INIT_STATE = {
    viewState: INITIAL_VIEW_STATE,
    pointData: '',
    isLoaded: false,
    isUpload: false
  }
 
  const [state, setState] = useState(INIT_STATE)
 
  useEffect(() => registerLoaders(LASWorkerLoader), [])

  useEffect(() => {
  
    if(!state.isLoaded) return

    const rotateCamera = () => {
      setState({ ...state,
        viewState: {
          ...state.viewState,
          rotationOrbit: state.viewState.rotationOrbit + 120,
          transitionDuration: 2400,
          transitionInterpolator,
          onTransitionEnd: rotateCamera
        }
      })
    }
    rotateCamera()
  }, [state, state.isLoaded])
  
  const onDataLoad = ({ header }) => {
 
    if(header.boundingBox) {
  
      const [mins, maxs] = header.boundingBox
 
      setState({ ...state,
        viewState: {
          ...state.viewState,
          target: [(mins[0] + maxs[0]) / 2, (mins[1] + maxs[1]) / 2, (mins[2] + maxs[2]) / 2],
          zoom: Math.log2(window.innerWidth / (maxs[0] - mins[0])) - 1
        },
        isLoaded: true
      })
 
    }
  }
 
  const convertLoadersMeshToDeckPointCloudData = attributes => {

    const deckAttributes = { getPosition: attributes.POSITION }
    if(attributes.COLOR_0) deckAttributes.getColor = attributes.COLOR_0

    return {
      length: attributes.POSITION.value.length / attributes.POSITION.size,
      attributes: deckAttributes
    }
  }

  const loadFile = async e => {

    const { attributes, loaderData } = await load(e.target.files[0], LASLoader)
    const { maxs, mins } = loaderData.header
  
    const deckPointCloudData = convertLoadersMeshToDeckPointCloudData(attributes)
  
    setState({ ...state,
      viewState: { ...state.viewState,
        target: [(mins[0] + maxs[0]) / 2, (mins[1] + maxs[1]) / 2, (mins[2] + maxs[2]) / 2],
        zoom: Math.log2(window.innerWidth / (maxs[0] - mins[0])) - 1
      },
      pointData: deckPointCloudData,
      isUpload: true
    })
  }
  
  const _LayerRendering = () => {
    
    return [
      state.pointData &&
      new PointCloudLayer({
        id: 'point-cloud-layer',
        coordinateSystem: COORDINATE_SYSTEM.CARTESIAN,
        data: state.pointData,
        onDataLoad,
        getNormal: [0, 1, 0],
        getColor: [255, 255, 255],
        opacity: 0.5,
        pointSize: 0.5
      })
    ]
  }

  return(
    <Fragment>
      <div>
        <input type='file' onChange={ loadFile }/>
      </div>
      { state.isUpload ?
        <DeckGL
          views={ new OrbitView() }
          viewState={ state.viewState }
          controller={ true }
          onViewStateChange={ v => setState({ ...state, viewState: v.viewState }) }
          layers={ _LayerRendering() }
          parameters={{
            clearColor: [0.93, 0.86, 0.81, 1]
          }}
        />
        : null
      }
    </Fragment>
  )
}

export default Main

