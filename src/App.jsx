import './App.css'
import Poptions from './Components/Poptions'
import TittleBar from './Components/TittleBar'
import Card from './Components/Card'

import { useState } from 'react'
function App(){

  const [profile , setprofile]=useState('Leetcode');

  return (
    <>
   <TittleBar tittle={"secretpage"}/>
   <h1 id='line'>Never Miss Any Next Contest........</h1>
    <div id='Poptions'>
   <Poptions name={"Leetcode"} profile={profile} setprofile={setprofile}/>
   <Poptions name={"Codeforces"} profile={profile} setprofile={setprofile}/>
   <Poptions name={"Codechef"} profile={profile} setprofile={setprofile}/>
   </div>
   <div id="cardarea">
        <Card profile={profile} id='cardui'/>
   </div>
   </>
  )
}

export default App
