import React from 'react'
import { useEffect } from 'react'
import { useState } from 'react'
import { fetch_users } from './api/api'
const App = () => {
const [data,setData]=useState({})
useEffect(()=>{
  setData(fetch_users())
},[])
console.log("data: "+data)
  return (
    <div>App</div>
  )
}

export default App