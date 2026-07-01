from fastapi import FastAPI
import requests
from fastapi.middleware.cors import CORSMiddleware
import pandas as pd 
app = FastAPI()
app.add_middleware(
    CORSMiddleware, 
    allow_credentials=True,
    allow_origins=["*"],
    allow_headers= ["*"],
    allow_methods=["*"],
)


def get_contests(n):
    url = "https://codeforces.com/api/contest.list?gym=false"
    response = requests.get(url="https://codeforces.com/api/contest.list?gym=false")
    response = response.json()
    contests = response["result"]
    contest_list = []

    for i in range (n):
        temp =[]
        temp.append(contests[i]['name'])
        temp.append(contests[i]["phase"])
        temp.append(contests[i]['durationSeconds'])
        temp.append(contests[i]["startTimeSeconds"])
        contest_list.append(temp)
    return contest_list
URL= 'https://leetcode.com/graphql/'

upcoming_contest= requests.post(URL,
                                json={
                                    "operationName":"contestV2UpcomingContests",
                                    "query":"\n query contestV2UpcomingContests {\n contestV2UpcomingContests {\n titleSlug\n title\n titleCn\n startTime\n duration\n cardImg\n cardImgApp\n }\n}\n ",
                                    "variables":{},
                                },
                             )
past_contest = requests.post(URL, json={
                        "operationName" :"contestV2HistoryContests",
                        "query":"\n query contestV2HistoryContests($skip: Int!, $limit: Int!) {\n contestV2HistoryContests(skip: $skip, limit: $limit) {\n totalNum\n contests {\n titleSlug\n title\n titleCn\n startTime\n duration\n cardImg\n cardImgApp\n companyWatermark\n solved\n totalQuestions\n }\n }\n}\n ",
                        "variables":{"limit":10 , "skip":0},
})

@app.get("/Leetcode")
async def f():
    print("Leetcode endpoint : Hitted ")
    return {"upcoming_contest":upcoming_contest.json() ,
            "past_contest":past_contest.json()}

@app.get("/Codechef/")
async def  func():
    data = requests.get("https://www.codechef.com/api/list/contests/all?sort_by=START&sorting_order=asc&offset=0&mode=all").json()
    data= data["future_contests"]
    print("codechef endpoint : Hitted ")
    return {"data":data}


@app.get("/Codeforces/")
async def func():
    contestlist= get_contests(10) 
    print("codeforces endpoint : Hitted ")
    return {"contest_list":contestlist}
@app.get("/")
async def home():
    return {"status": "Backend Running 🚀"}

@app.get("/health")
async def health():
    return {"status": "ok"}