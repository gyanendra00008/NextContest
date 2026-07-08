import './App.css'
import Poptions from './Components/Poptions'
import TittleBar from './Components/TittleBar'
import Card from './Components/Card'
import { useEffect, useRef } from 'react'
import { useState } from 'react'
import Footer from './Components/Footer'
function App(){

  const [profile , setprofile]=useState('Leetcode');


  function handle_color(){
  if(profile=='Leetcode'){
      
    
  }else if(profile=='Codeforces'){

  }else if(profile=='Codechef'){

  }
  }
  function scroll() {
  document.getElementById("cardarea").scrollIntoView({
    behavior: "smooth"
  });}

  return (
    <>
   <TittleBar tittle={"secretpage"}/>
   <div id="prevdiv">
    <h1 id='line'>All Your Contest info in one place...</h1>
    <h1 id="sline">
    <h1>Supported: </h1>
    <h2><ul>
    <li>Leetcode</li>
    <li>Codeforces</li>
    <li>Codechef</li>
    </ul> </h2></h1>
   </div>
   <h1 id='scrolldownline' href='#cardarea' onClick={scroll} >Scroll Down ⏬ </h1>
   
  <div id='Poptions'>
   <Poptions name={"Leetcode"} profile={profile} setprofile={setprofile}  />
   <Poptions name={"Codeforces"} profile={profile} setprofile={setprofile}  />
   <Poptions name={"Codechef"} profile={profile} setprofile={setprofile}  />
   </div>

   <div id="cardarea">
        <Card profile={profile} id='cardui'/>
   </div>
   <Footer />
   
   </>
  )
}

export default App
