const request=require('request-promise').defaults({
    headers:{
        'X-Requested-With':'XMLHttpRequest'
    }
})//这个是http网络请求库
const Cookie=require('tough-cookie')//这个是cookie的工具库
const cheerio=require('cheerio')//用来解析html的
const fs=require('fs')
const userId='18640025430'
const passWord='nimabi123'
let cookies

function setCookie(httpResponse) {
    if (httpResponse.headers['set-cookie'] instanceof Array)
        cookies = httpResponse.headers['set-cookie'].map(Cookie.parse);
    else
        cookies = [Cookie.parse(httpResponse.headers['set-cookie'])];
}
async function excute() {
    //登录并获取 cookie
   try{
       let loginResponse=await request({
           method:'POST',
           uri:'http://passport.zujuan.com/login',
           resolveWithFullResponse: true,
           headers:{

           },
           form:
               { 'LoginForm[username]': userId,
                 'LoginForm[password]': passWord,
                 'LoginForm[rememberMe]': '1'
               }
       })
       let body=typeof loginResponse.body==='string'?JSON.parse(loginResponse.body): loginResponse.body
       if(body.errcode===0){
           setCookie(loginResponse)
       }
   }
   catch(ex){
      console.log('登录过程异常')
      console.log(ex)
   }
   //这部分是获取问题列表，我就只获取第一页的了
   let questionIDList=[]
   try{
       let questionListHtml=await request({
           method:"GET",
           uri:'http://www.zujuan.com/question/index?chid=2&xd=1&page=1&per-page=10',
           headers:{
               cookie:cookies.toString()
           }
       })
       let questionListDOM=cheerio.load(questionListHtml)
       let InfoScript=questionListDOM('script').filter((index,element)=>{
          return cheerio.load(element).html().indexOf("MockDataTestPaper")!==-1
       })[0]
       InfoScript=cheerio.load(InfoScript).html().match(/var MockDataTestPaper[\S,\s]*?scores":\[]}];/)[0].replace(/\n/g,"")
       eval(InfoScript)
       questionIDList=MockDataTestPaper[0].questions.map(e=>e.question_id)
   }
   catch (ex){
       console.log('获取问题列表异常')
       console.log(ex)

   }
   //根据问题列表ID去获取问题详细
   let questionsList=await Promise.all(questionIDList.map(async id=>{
       try{
           let questionDetail=await request({
               method:"GET",
               uri:`http://www.zujuan.com/question/detail-${id}.shtml`,
               headers:{
                   cookie:cookies.toString()
               }
           })
           let questionDetailDOM=cheerio.load(questionDetail)
           let DetailScript=questionDetailDOM('script').filter((index,element)=>{
               return cheerio.load(element).html().indexOf("MockDataTestPaper")!==-1
           })[0]
           DetailScript=cheerio.load(DetailScript).html().match(/var MockDataTestPaper[\S,\s]*?\}\] ;/)[0].replace(/\n/g,"")
           eval(DetailScript)
           return MockDataTestPaper[0]
       }
       catch (ex){
           console.log('获取问题详细异常')
           console.log(ex)
       }


   }))
    fs.writeFileSync('result.txt',JSON.stringify(questionsList,null,2))



}
excute()
