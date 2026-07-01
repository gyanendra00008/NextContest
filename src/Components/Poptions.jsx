import React from 'react'
import './Poptions.css'
const Poptions = (props) => {

  function handle_clickk(){
      props.setprofile(props.name);
      return;
  }
  return (
    <>
    <div id='optionName' onClick={handle_clickk}><h1>{props.name}</h1>
    </div>
    </>
  )
}

export default Poptions