import React, { useEffect, useRef } from 'react'
import './Poptions.css'

const Poptions = (props) => {
  const divref=useRef();
  function handle_clickk(){
      props.setprofile(props.name);
      return;
  }
  useEffect(()=>{
    if(props.name==props.profile)
      divref.current.style.backgroundColor = "blue";
    else {
       divref.current.style.backgroundColor = "rgb(2, 8, 71)";
    }
  },[props.profile])

  return (

    <div id='optionName' onClick={handle_clickk} ref={divref}><h1>{props.name}</h1>
    </div>
    
  )
}

export default Poptions