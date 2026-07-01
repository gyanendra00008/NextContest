import React from 'react'
import './Tittlebar.css'
const TittleBar = () => {
  return (
    <div id='header'>
          <div id="innerheader">
              <div id="logodiv"><img src="/Mylogo.png" alt="" id="logoimg" /></div>
              <div id="tittlediv"><h2>NextContest</h2></div>
              <div id="aboutdiv"><h2>About</h2></div>

          </div>
    </div>
  )
}

export default TittleBar