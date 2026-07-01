import './App.css'
import Poptions from './Components/Poptions'
import TittleBar from './Components/TittleBar'
import Card from './Components/Card'
import { useEffect, useRef } from 'react'
import { useState } from 'react'
function App(){

  const [profile , setprofile]=useState('Leetcode');
  // const lc_ref = useRef();
  // const cf_ref = useRef();
  // const cc_ref = useRef();

  // if(profile==='Leetcode'){
  //         lc_ref.current.style.backgroundColor='blue';
  //       }else if(profile==='Codeforces'){
  //         cf_ref.current.style.backgroundColor='blue';
  //       }else if(profile==='Codechef'){
  //         cc_ref.current.style.backgroundColor='blue';
  // }


  return (
    <>
   <TittleBar tittle={"secretpage"}/>
   <h1 id='line'>Never Miss Any Next Contest........</h1>
  <div id='Poptions'>
   <Poptions name={"Leetcode"} profile={profile} setprofile={setprofile}  />
   <Poptions name={"Codeforces"} profile={profile} setprofile={setprofile}  />
   <Poptions name={"Codechef"} profile={profile} setprofile={setprofile}  />
   </div>
   <div id="cardarea">
        <Card profile={profile} id='cardui'/>
   </div>
   
   </>
  )
}

export default App
