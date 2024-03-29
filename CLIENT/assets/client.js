class Client {

    socket;
    socket_url;
    SOCKET_ENDPOINT="https://bg-q0gi.onrender.com" || "http://fra-srv.mywire.org:51420";

    // HTML AREA
    DOCUMENT=window;
    messages = this.getEl('messages');
    form = this.getEl('form');
    input = this.getEl('input');
    span = document.getElementsByClassName("close")[0];
      // Get the button homepage
  btnPlay = this.getEl("play");
  btnConf = this.getEl("conf");
  btnStats = this.getEl("stats");
  btnChat = this.getEl("chat");
  btnPlayGame = this.getEl("playGame");

    //imposta orario e temp 
    temp;
    timeNow= this.getTime();


    constructor(socket_url=this.SOCKET_ENDPOINT){
        this.socket = io(this.SOCKET_ENDPOINT,{
          /*credentials: true,*/reconnectionAttempts: 3 , reconnectionDelay: 60000, cors: {origin: "https://*.render.com"} })
        this.init();
        this.eventDom();
    }

    getTime () {
        this.timeNow= new Date().toLocaleTimeString();
        return this.timeNow
    }
    
    createEl(tag,parent,htmlContent,className){
        let item = document.createElement(tag);
        item.className=className || null;

        item.innerHTML = htmlContent;
        parent.appendChild(item);

    }

    getEl(id){
        let tempEl=document.getElementById(id);
        return tempEl
    }

    eventDom(){
        this.DOCUMENT.onclick = (event)=> {
           // console.log(event.target);
          if (event.target == this.modal) {
            this.modal.style.display = "none";
            this.closeModal();
          }
         }

        this.span.onclick = ()=> {
            this.modal.style.display = "none";
            this.closeModal();
          }

          
        this.btnChat.onclick = ()=> {
            this.openPag('chat');
          }

        this.btnConf.onclick = ()=> {
            this.openPag('conf');
          }
        this.btnStats.onclick = ()=> {
            this.openPag('stat');
          }
        this.btnPlay.onclick = ()=> {
            this.openPag('game');
          }
        this.btnPlayGame.onclick = ()=> {
            this.openPag('gameArea');
          }

     }

    init(){

        this.form.addEventListener('submit', function(e) {
            e.preventDefault();
            if (this.input.value) {
              timeNow=this.getTime();
              this.socket.emit('chat message', this.input.value,this.timeNow);
              this.input.value = '';
            }
          });


        this.socket.on('chat message', ({msg,username,isSystemMessage,timestamp}) =>{

      
         if(isSystemMessage){
            this.temp=` ${msg} <time> ${username} </time>`; 
            }else{
            this.temp=`<user>${username}</user>: ${msg} <time> ${timestamp} </time>`;
            } 
        
         this.createEl('div',this.messages,this.temp, 'message chat')

         document.querySelector("#myModal > div").scrollTo(0,7)

        });


        this.socket.on("setNick", (userNick) => {
            console.log('ti è stato dato il nickName...'+userNick);
            //localStorage.setItem("nickName", userNick);
          });

        this.socket.on("chatRecord", (data) => {
            console.log(data);

            for (let i = data.length-30; i < data.length; i++) {
                this.temp=`<user>${data[i].userName}</user>: ${data[i].content} <time> ${data[i].createdAt} </time>`;
                this.createEl('div',this.messages,this.temp, 'message chat');
                }
              
            });

        this.socket.on('gameSet', (data,typeGame)=> {
                console.log(data);
    
                if(typeGame==="campain"){  
    
                    openPage('playGround');
                    let page= document.getElementById('buttonAreaH');
    
                for (let i = 0; i < data.length; i++) {
                    //creazione button
                    var item = document.createElement('button');
                    //aggiungi classe al botton
                    item.className='buttonGame effettoCiakka';
                     //creazione elemento spam ove contenitore numero
                     var itemDue = document.createElement('spam');
                     //prendi il numero da data
                     itemDue.innerText=data[i]
                     item.appendChild(itemDue);
                     page.appendChild(item);
                }
    
                }else{
    
                    // if(typeGame==="1vs1"
                //messaggio x testare anzi x avvisare i giocatori x il 1vs1
                let page= document.getElementById('waitingplayer')
           //se la pagine contiene la classe hide la leva...altrimenti nn fa nulla...loool;
           if(page.classList.contains("hide")){
                  page.classList.toggle("hide");
            } else{ };
                document.getElementById('waitingplayerText').innerText=data;
            }
    
        ///QUI CREO LA LOGICA DEL GIOCO SINGOLO CAMPAIGN UNA VOLTA RICEVUTO ARRAY CON I NUMERI
           
                
            
            })
    

    }
    

}

class Page extends Client{
  
  // GET ALL THE PAGE AREA in a containers
  pageConf =this.getEl('modal-conf-page')        // PAGINA CONFIGURAZIONE
  pageChat= this.getEl('modal-body')  // PAGINA CHAT
  pageStat= this.getEl('modal-conf-stat')  // PAGINA STAT CLASSSSIFICA
  pageGame= this.getEl('modal-conf-game');  //INIZIO SCELTA GIOCO

  pageGameArea= this.getEl('modal-playGround'); // PLAY AREA
  testoHeader= this.getEl('labelPage');// MODAL TEXT & GRAPHIC EDIT
  logoHeader= this.getEl('labelLogo');
  // Get the modal
  modal = this.getEl("myModal");


  // Get the <span> element that closes the modal



 openPag(page){
    this.modal.style.display = "block";

    switch(page) {
        case 'conf':
          this.buildPage('conf')
          break;
        case 'chat':
            this.buildPage('chat')
          break;
        case 'stat':
            this.buildPage('stat')
            break;
        case 'game':
            this.buildPage('game')
            break;
        case 'gameArea':
            this.buildPage('gameArea')
            break;
        default:
            console.log('Error Page:'+page)
          // code errore da inserire
    }

 }

 buildPage(pageToBuild){
    let page=pageToBuild;
    if(page==='gameArea'){ this.closeModal()}
    let infoPage={ 
        conf:[this.pageConf,"CONFIGURAZIONI","fa-solid fa-gear"],
        chat:[this.pageChat,"CHAT","fa-solid fa-comment"],
        stat:[this.pageStat,"CLASSIFICA","fa-solid fa-star"],
        game:[this.pageGame,"GAME","fa-solid fa-play"],
        gameArea:[this.pageGameArea,"PLAYGAME","fa-solid fa-play"]

}
    let pageTemp=infoPage[`${page}`][0];
    if(pageTemp.classList.contains("hide")){
        pageTemp.classList.toggle("hide");
  } else{ };

  this.testoHeader.innerText=infoPage[`${page}`][1];
  this.logoHeader.className=infoPage[`${page}`][2];

 }
 
 closeModal(){
  
             //se la pagine contiene la classe hide la leva...altrimenti nn fa nulla...loool;
       if(this.pageConf.classList.contains("hide")){ } else{ this.pageConf.classList.toggle("hide");  };
       
       if(this.pageChat.classList.contains("hide")){ } else{ this.pageChat.classList.toggle("hide");  };

       if(this.pageStat.classList.contains("hide")){ } else{ this.pageStat.classList.toggle("hide");  };

       if(this.pageGame.classList.contains("hide")){ } else{ this.pageGame.classList.toggle("hide");  };

       if(this.pageGameArea.classList.contains("hide")){ } else{ this.pageGameArea.classList.toggle("hide");  };
}
 /* SE apri costructor devo usare super x ereditare le propietà di client
    constructor(name, age, school) {
        super(name, age);
        this.school = school;
      }
*/

}
