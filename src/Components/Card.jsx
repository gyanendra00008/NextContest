import React, { useEffect } from 'react'
import { resume } from 'react-dom/server';
import './Card.css'
import { useState } from 'react';
const Card = (props) => {
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
        <h1>Leetcode</h1>
        <h2>Upcoming Contest...</h2>
    <div>
        <table>
          <tbody>
          <tr>
            <td>{data[0][0]}</td>
            <td>{data[0][1]}</td>
          </tr>
          <tr>
            <td>{data[1][0]}</td>
            <td>{data[1][1]}</td>
          </tr>
          </tbody>
        </table>
    </div>
        <br />
        
      <h2>Past Contest...</h2>
      <table>
        <tbody>
          <tr>
            <td>{data2[0][0]}</td>
            <td>{data2[0][1]}</td>
          </tr>
          <tr>
            <td>{data2[1][0]}</td>
            <td>{data2[1][1]}</td>
          </tr>
          <tr>
            <td>{data2[2][0]}</td>
            <td>{data2[2][1]}</td>
          </tr>
          <tr>
            <td>{data2[3][0]}</td>
            <td>{data2[3][1]}</td>
          </tr>
          <tr>
            <td>{data2[4][0]}</td>
            <td>{data2[4][1]}</td>
          </tr>
          <tr>
            <td>{data2[5][0]}</td>
            <td>{data2[5][1]}</td>
          </tr>
          <tr>
            <td>{data2[6][0]}</td>
            <td>{data2[6][1]}</td>
          </tr>
          <tr>
            <td>{data2[7][0]}</td>
            <td>{data2[7][1]}</td>
          </tr>
          <tr>
            <td>{data2[8][0]}</td>
            <td>{data2[8][1]}</td>
          </tr>
        </tbody>
      </table>


    </div>
  )
        
    }else if(props.profile =='Codeforces'){
      let data = result.contest_list;
      if (!data){
        return <div>Loading...</div>;
    }
 return (
    <div id='CF'>
      <h1>Codeforces</h1>
      <h2>The Contests...</h2>
      <table>
        <tbody>
          <tr>
            <td>{data[0][0]}</td>
            <td>{data[0][1]}</td>
            <td>{data[0][2]}</td>
            <td>{data[0][3]}</td>
          </tr>
          <tr>
            <td>{data[1][0]}</td>
            <td>{data[1][1]}</td>
            <td>{data[1][2]}</td>
            <td>{data[1][3]}</td>
          </tr>
          <tr>
            <td>{data[2][0]}</td>
            <td>{data[2][1]}</td>
            <td>{data[2][2]}</td>
            <td>{data[2][3]}</td>
          </tr>
          <tr>
            <td>{data[3][0]}</td>
            <td>{data[3][1]}</td>
            <td>{data[3][2]}</td>
            <td>{data[3][3]}</td>
          </tr>
          <tr>
            <td>{data[4][0]}</td>
            <td>{data[4][1]}</td>
            <td>{data[4][2]}</td>
            <td>{data[4][3]}</td>
          </tr>
          <tr>
            <td>{data[5][0]}</td>
            <td>{data[5][1]}</td>
            <td>{data[5][2]}</td>
            <td>{data[5][3]}</td>
          </tr>
          <tr>
            <td>{data[6][0]}</td>
            <td>{data[6][1]}</td>
            <td>{data[6][2]}</td>
            <td>{data[6][3]}</td>
          </tr>
          <tr>
            <td>{data[7][0]}</td>
            <td>{data[7][1]}</td>
            <td>{data[7][2]}</td>
            <td>{data[7][3]}</td>
          </tr>
          <tr>
            <td>{data[8][0]}</td>
            <td>{data[8][1]}</td>
            <td>{data[8][2]}</td>
            <td>{data[8][3]}</td>
          </tr>
          <tr>
            <td>{data[9][0]}</td>
            <td>{data[9][1]}</td>
            <td>{data[9][2]}</td>
            <td>{data[9][3]}</td>
          </tr>
        </tbody>
      </table>

    
    
  
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
        <h1>Codechef..</h1>
        <h2>The Contests ...</h2>

        <table>
          <thead>
            <tr>
            <td><h3>Contest Name </h3></td>
            <td><h3>Contest Time</h3></td>
            <td><h3>Duration</h3></td>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>{data[0][0]}</td>
              <td>{data[0][1]}</td>
              <td>{data[0][2]}</td>
            </tr>
            <tr>
              <td>{data[1][0]}</td>
              <td>{data[1][1]}</td>
              <td>{data[1][2]}</td>
            </tr>
            <tr>
              <td>{data[2][0]}</td>
              <td>{data[2][1]}</td>
              <td>{data[2][2]}</td>
            </tr>
            <tr>
              <td>{data[3][0]}</td>
              <td>{data[3][1]}</td>
              <td>{data[3][2]}</td>
            </tr>
            <tr>
              <td>{data[4][0]}</td>
              <td>{data[4][1]}</td>
              <td>{data[4][2]}</td>
            </tr>
          </tbody>
        </table>




    </div>

  )
    }
}

export default Card