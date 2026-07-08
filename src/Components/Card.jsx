import React, { useEffect } from 'react'
import { resume } from 'react-dom/server';
import './Card.css'
import { useState } from 'react';
const Card = (props) => {
  function convert(timestamp){
    return new Date(timestamp*1000).toLocaleString("en-IN",{
        day:"2-digit",
        month:"short",
        hour:"2-digit",
        minute:"2-digit",
    });
  }


  const [result , setresult]=useState(null);
    async function get_data(){
            try{
                const response = await fetch("https://nextcontest-1.onrender.com/" + props.profile);
            
            const dat = await response.json();
            console.log(result)
            setresult(dat);
            }catch(e){
                console.log(e);
                console.log("Anything is wrong here");

            }
    }
    useEffect(() => {
      setresult(null);
      get_data();
      console.log("fetching..........",props.profile);
    }, [props.profile]);
    if(!result){
      return <div>Loading.....</div>
    }
    if(props.profile=='Leetcode'){
       if (!result?.upcoming_contest?.data?.contestV2UpcomingContests) {
        return <div>Loading...</div>;
    }
      let data= [];
          for(let i=0 ; i<2; i++){
                let info=[];
                let obj = result.upcoming_contest.data.contestV2UpcomingContests[i];
                info.push(obj.title);
                info.push(obj.startTime);
                data.push(info);
          }

      
       if (!result?.past_contest?.data?.contestV2HistoryContests.contests) {
        return <div>Loading...</div>;
    }
      let data2= [];
          for(let i=0 ; i<9; i++){
                let info=[];
                let obj = result.past_contest.data.contestV2HistoryContests.contests[i];
                info.push(obj.title);
                info.push(obj.startTime);
                data2.push(info);
          }

     return (
    <div id='LC'>
  
        <h2>Upcoming Contest...</h2>
    <div>
        <table>
          <tbody>
          <tr>
            <td>{data[0][0]}</td>
            <td>{convert(data[0][1])}</td>
          </tr>
          <tr>
            <td>{data[1][0]}</td>
            <td>{convert(data[1][1])}</td>
          </tr>
          </tbody>
        </table>
    </div>
        <br />
        
      <h2>Past Contest...</h2>
      <table>
        <tbody>
         {data2.map((row, index) => (
                      <tr key={index}>
                      <td>{row[0]}</td>
                      <td>{convert(row[1]*1000)}</td>
                            </tr>
                      ))}
                    </tbody>
      </table>
      <div className="gotothere"><a href="https://leetcode.com/contest/">GO to The {props.profile}</a></div>


    </div>
  )
        
    }else if(props.profile =='Codeforces'){
      let data = result.contest_list;
      if (!data){
        return <div>Loading...</div>;
    }
 return (
    <div id='CF'>
    
      
      <table>
        <tbody>
         {data.map((row, index) => (
                      <tr key={index}>
                      <td>{row[0]}</td>
                      <td>{row[1]}</td>
                      {/* <td>{row[2]}</td> */}
                      <td>{convert(row[3]*1000)}</td>
                            </tr>
                      ))}
                    </tbody>
      </table>

    
    
          <div className="gotothere"><a href="https://codeforces.com/contests">GO to The {props.profile}</a></div>

    </div>
  )
    }else if(props.profile=='Codechef'){
        let obj=result.data;

        if(!obj){
          return <div>Loading...</div>
        }
        let data = [];
        for(let i=0 ; i< obj.length ; i++){
            let name  = obj[i].contest_name;
            let date = obj[i].contest_start_date;
            let duration = obj[i].contest_duration;
            data.push([name , date, duration]);
        }
 return (
    <div id='CC'>
        
        

        <table>
          <thead>
            <tr>
            <td><h3>Contest Name </h3></td>
            <td><h3>Contest Time</h3></td>
            <td><h3>Duration</h3></td>
            </tr>
          </thead>
          <tbody>
         {data.map((row, index) => (
                      <tr key={index}>
                      <td>{row[0]}</td>
                      <td>{row[1]}</td>
                      <td>{row[2]} mins</td>
                      </tr>
                      ))}
                    </tbody>
        </table>
        
                  <div className="gotothere"><a href="https://www.codechef.com/contests">GO to The {props.profile}</a></div>





    </div>

  )
    }
}

export default Card