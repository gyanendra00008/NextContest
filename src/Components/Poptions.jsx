import { useEffect, useRef } from 'react';
import './Poptions.css';

const Poptions = ({ name, profile, setprofile }) => {
  const divref = useRef();
  
  function handleClick() {
    setprofile(name);
  }

  useEffect(() => {
    if (name === profile) {
      if (divref.current) divref.current.style.backgroundColor = "blue";
    } else {
      if (divref.current) divref.current.style.backgroundColor = "rgb(2, 8, 71)";
    }
  }, [profile, name]);

  return (
    <div id='optionName' onClick={handleClick} ref={divref}>
      <h1>{name}</h1>
    </div>
  );
};

export default Poptions;
