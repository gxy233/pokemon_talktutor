import * as Phaser from "phaser";
import { Scene, Tilemaps, GameObjects, Physics, Math as Mathph } from "phaser";
import { Player } from "../../classes/player";
import { NPC } from "../../classes/npc";
import { DIRECTION } from "../../utils";
import {
  TextBox,
  Click,
} from "../../phaser3-rex-plugins/templates/ui/ui-components";
import UIPlugin from "../../phaser3-rex-plugins/templates/ui/ui-plugin";
import BoardPlugin from "../../phaser3-rex-plugins/plugins/board-plugin";
import { PathFinder } from "../../phaser3-rex-plugins/plugins/board-components";
import { TileXYType } from "../../phaser3-rex-plugins/plugins/board/types/Position";
import { shuffle } from "../../utils";
import { COLOR_DARK, COLOR_LIGHT, COLOR_PRIMARY } from "../../constants";
//必须引入的核心，换成require也是一样的。注意：recorder-core会自动往window下挂载名称为Recorder对象，全局可调用window.Recorder，也许可自行调整相关源码清除全局污染
import Recorder from 'recorder-core';
//引入相应格式支持文件；如果需要多个格式支持，把这些格式的编码引擎js文件放到后面统统引入进来即可
import '../../../node_modules/recorder-core/src/engine/mp3';
import '../../../node_modules/recorder-core/src/engine/mp3-engine' ;//如果此格式有额外的编码引擎（*-engine.js）的话，必须要加上
import '../../../node_modules/recorder-core/src/extensions/waveview';



export class TownScene extends Scene {
  private timeFrame: number = 0;
  private isQuerying: boolean = false;

  private map: Tilemaps.Tilemap;
  private tileset: Tilemaps.Tileset;
  private groundLayer: Tilemaps.TilemapLayer;
  private wallLayer: Tilemaps.TilemapLayer;
  private flowerLayer: Tilemaps.TilemapLayer;
  private treeLayer: Tilemaps.TilemapLayer;
  private houseLayer: Tilemaps.TilemapLayer;

  private player: Player;
  private npcGroup: GameObjects.Group;
  private keySpace: Phaser.Input.Keyboard.Key;
  private keyEnter: Phaser.Input.Keyboard.Key;
  public rexUI: UIPlugin;
  public rexBoard: BoardPlugin;
  private board: BoardPlugin.Board;
  private pathFinder: PathFinder;

  constructor() {
    super("town-scene");
  }

  create(): void {
    this.keySpace = this.input.keyboard!.addKey("SPACE");
    this.keyEnter = this.input.keyboard!.addKey("ENTER");
    this.initMap();
    this.initSprite();
    this.initCamera();
    // this.add.grid(0, 0, 1024, 1024, 16, 16, 0x000000).setAlpha(0.1);
  }

  update(time, delta): void {
    this.timeFrame += delta; //更新时间
    this.player.update();   //更新player

    this.npcGroup.getChildren().forEach(function (npc) {//遍历所有的NPC并调用它们的update方法。涉及NPC的移动、动画或其他活动。
      (npc as NPC).update();
    });

    if (this.timeFrame > 5000) {// 超过5000s后触发
      if (!this.isQuerying) {//在这个定时查询中，首先检查当前是否有正在进行的查询。如果没有，则开始一个新的查询：
        this.isQuerying = true;
        var allNpcs = this.npcGroup.getChildren();
        var shouldUpdate = [];

        for (let i = 0; i < this.npcGroup.getLength(); i++) { //收集当前不在移动和说话状态的NPC。
          // for (let i = 0; i < 1; i++) {
          if (
            !(allNpcs[i] as NPC).isMoving() &&
            !(allNpcs[i] as NPC).isTalking()
          ) {
            shouldUpdate.push(i);
          }
        }
        //向一个外部服务（可能是一个AI或决策制定服务）发送请求，询问这些NPC接下来应该做什么。
        //根据外部服务的回复，更新每个NPC的状态和行为。例如，让某个NPC移动到指定位置，或与另一个NPC说话。
        //一旦处理完外部服务的所有回复，将isQuerying标志设置为false，表示当前没有正在进行的查询
        fetch("http://127.0.0.1:10002/make_decision", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          credentials: "same-origin",
          body: JSON.stringify({
            agent_ids: shouldUpdate,
          }),
        }).then((response) => {
          response.json().then((data) => {
            this.npcGroup.getChildren().forEach(function (npc) {
              (npc as NPC).destroyTextBox();
            });
            for (let i = 0; i < data.length; i++) {
              var npc = allNpcs[shouldUpdate[i]] as NPC;
              if (data[i].content == "") continue;
              var content = JSON.parse(data[i].content);
              switch (content.action) {
                case "MoveTo":
                  var tile = this.getRandomTileAtLocation(content.to);
                  if (tile == undefined) break;
                  npc.destroyTextBox();
                  this.moveNPC(shouldUpdate[i], tile, undefined, content.to);
                  break;
                case "Speak":
                  var ret = this.getNPCNeighbor(content.to);
                  var tile = ret[0];
                  var finalDirection = ret[1];
                  var listener = ret[2];
                  if (tile == undefined) break;
                  this.moveNPC(
                    shouldUpdate[i],
                    tile,
                    finalDirection,
                    undefined,
                    listener
                  );
                  npc.setTextBox(content.text);
                  break;
                default:
                  npc.setTextBox("[" + content.action + "]");
                  break;
              }
            }
            this.isQuerying = false;
          });
        });
      }
      this.timeFrame = 0;
    }
  }

  initMap(): void {
    this.map = this.make.tilemap({
      key: "town",
      tileWidth: 16,
      tileHeight: 16,
    });
    this.tileset = this.map.addTilesetImage("town", "tiles")!;
    this.groundLayer = this.map.createLayer("ground", this.tileset, 0, 0)!;
    this.wallLayer = this.map.createLayer("wall", this.tileset, 0, 0)!;
    this.flowerLayer = this.map.createLayer("flower", this.tileset, 0, 0)!;
    this.treeLayer = this.map.createLayer("tree", this.tileset, 0, 0)!;
    this.houseLayer = this.map.createLayer("house", this.tileset, 0, 0)!;

    this.wallLayer.setCollisionByProperty({ collides: true });
    this.treeLayer.setCollisionByProperty({ collides: true });
    this.houseLayer.setCollisionByProperty({ collides: true });
    this.board = this.rexBoard.createBoardFromTilemap(this.map);
    this.board.getAllChess().forEach((chess) => {
      var collide = ["wall", "tree", "house"].includes(chess.layer.name);
      if (collide && chess.index != -1) {
        chess.rexChess.setBlocker();
      }
    });
    this.pathFinder = this.rexBoard.add.pathFinder({
      occupiedTest: true,
      blockerTest: true,
      pathMode: "straight",
      cacheCost: true,
    });
  }

  initSprite(): void {
    // NPC
    this.npcGroup = this.add.group();
    var npcPoints = this.map.filterObjects("npcs", (npc) => {
      return npc.type === "npc";
    });
    for (let i = 0; i < npcPoints.length; i++) {
      var npcPoint = this.map.findObject("npcs", (npc) => {
        for (let j = 0; j < npc.properties.length; j++) {
          if (npc.properties[j].name === "id") {
            return npc.properties[j].value === i;
          }
        }
      });
      var tileXY = this.board.worldXYToTileXY(npcPoint.x, npcPoint.y);
      var npc = new NPC(
        this,
        this.board,
        npcPoint.x,
        npcPoint.y,
        npcPoint.name,
        npcPoint.properties[0].value
      );
      this.board.addChess(npc, tileXY.x, tileXY.y, 0, true);
      this.physics.add.collider(npc, this.npcGroup);
      this.npcGroup.add(npc);
    }

    this.physics.add.collider(this.npcGroup, this.wallLayer);
    this.physics.add.collider(this.npcGroup, this.treeLayer);
    this.physics.add.collider(this.npcGroup, this.houseLayer);
    // this.physics.add.collider(this.npcGroup, this.npcGroup);

    // Player
    this.player = new Player(this, 288, 240);
    this.physics.add.collider(this.player, this.wallLayer);
    this.physics.add.collider(this.player, this.treeLayer);
    this.physics.add.collider(this.player, this.houseLayer);
    this.physics.add.collider(
      this.player,
      this.npcGroup,
      (player: Player, npc: NPC) => {
        npc.pauseMoving();
        var checkResumeWalk = this.time.addEvent({
          delay: 1000,
          callback: () => {
            const nearbyDistance = 1.1 * Math.max(player.width, player.height);
            var distance = Mathph.Distance.Between(
              player.x,
              player.y,
              npc.x,
              npc.y
            );
            if (distance > nearbyDistance) {
              npc.resumeMoving();
              checkResumeWalk.destroy();
            }
          },
        });
      }
    );

    this.keySpace.on("up", () => {
      var ret = getNearbyNPC(this.player, this.npcGroup);
      var npc = ret[0];
      if (npc) {
        npc = npc as NPC;
        (npc as NPC).changeDirection(ret[1]);
        (npc as NPC).setTalking(true);
        this.createInputBox(npc);
      }
    });
    // this.keyEnter.on("up", () => {});

    this.physics.world.setBounds(
      0,
      0,
      this.groundLayer.width + this.player.width,
      this.groundLayer.height
    );
  }

  initCamera(): void {
    this.cameras.main.setSize(this.game.scale.width, this.game.scale.height);
    this.cameras.main.setBounds(
      0,
      0,
      this.groundLayer.width,
      this.groundLayer.height
    );
    this.cameras.main.startFollow(this.player, true, 0.09, 0.09);
    this.cameras.main.setZoom(4);
  }

  disableKeyboard(): void {
    this.input.keyboard.manager.enabled = false;
  }

  enableKeyboard(): void {
    this.input.keyboard.manager.enabled = true;
  }

  createInputBox(npc: Physics.Arcade.Sprite) {
    this.disableKeyboard();

    var upperLeftCorner = this.cameras.main.getWorldPoint(
      this.cameras.main.width * 0.2,
      this.cameras.main.height * 0.3
    );
    var x = upperLeftCorner.x;
    var y = upperLeftCorner.y;
    var width = this.cameras.main.width;
    var height = this.cameras.main.height;
    var scale = this.cameras.main.zoom;
    var win=window as any;
    var doc=document as any;
    var rec : any,wave : any, recBlob: any;
    var isRecording=false;
    var inputText = this.rexUI.add
      .inputText({
        x: x,
        y: y,
        width: width * 0.6,
        height: height * 0.3,
        type: "textarea",
        text: "",
        color: "#ffffff",
        border: 2,
        backgroundColor: "#" + COLOR_DARK.toString(16),
        borderColor: "#" + COLOR_LIGHT.toString(16),
      })
      .setOrigin(0)
      .setScale(1 / scale, 1 / scale)
      .setFocus()
      .setAlpha(0.8);
    


    
      
    var formatMs=function(ms:any,all?:any){
      var f=Math.floor(ms/60000),m=Math.floor(ms/1000)%60;
      var s=(all||f>0?(f<10?"0":"")+f+":":"")
        +(all||f>0||m>0?("0"+m).substr(-2)+"″":"")
        +("00"+ms%1000).substr(-3);
      return s;
    };
   

    
    var recordBtn = this.rexUI.add
    .label({
      x: x,
      y: y - 40, // 设置适当的位置
      background: this.rexUI.add
        .roundRectangle(0, 0, 2, 2, 20, COLOR_PRIMARY)
        .setStrokeStyle(2, COLOR_LIGHT),
      text: this.add.text(0, 0, "Record"),
      space: {
        left: 10,
        right: 10,
        top: 10,
        bottom: 10,
      },
    })
    .setOrigin(0)
    .setScale(1 / scale, 1 / scale)
    .layout();
    


    
   
    /**暂停录音**/
    function recPause() {
      if(rec && Recorder.IsOpen()) {
          rec.pause();
      } else {
        console.log("未打开录音", 1);
      }
    }

    /**恢复录音**/
    function recResume() {
      if(rec && Recorder.IsOpen()) {
          rec.resume();
      } else {
        console.log("未打开录音", 1);
      }
    }




    // 检查rec是否已经被初始化
    if (!rec) {
      // 使用你给出的库初始化rec
      rec = Recorder({
          type: "mp3",
          sampleRate: 16000,
          bitRate: 16
      });

      // 打开录音设备
      recOpen();
    }
    recordBtn.onClick(function() {
     
      
      console.log("recordBtn.onClick");
  
      // 检查rec是否已经被初始化
      if (!rec) {
          // 使用你给出的库初始化rec
          rec = Recorder({
              type: "mp3",
              sampleRate: 16000,
              bitRate: 16
          });
  
          // 打开录音设备
          recOpen();
      }
  
      if (!isRecording) {
          recordBtn.getElement('text').setText('Stop');
          console.log('!isRecording');
  
          recStart();
  
          isRecording = true;
      } else {
          console.log("Recording stopped");
          recordBtn.getElement('text').setText('Record');
  
          recStop();
          
          isRecording = false;
  
          // 我们应该在 recStop 中处理 blob 和 buffer 的保存
          // 因为recStop函数中的callback会收到这些数据
      }
  });
  
  /**调用open打开录音请求好录音权限**/
  function recOpen() {
    rec = null;
    wave = null;
    recBlob = null;

    let newRec = Recorder({
        type: "mp3",
        sampleRate: 16000,
        bitRate: 16,
        onProcess: function(buffers: any, powerLevel: any, bufferDuration: any, bufferSampleRate: any, newBufferIdx: any, asyncEnd: any) {
            // 录音实时回调，大约1秒调用12次本回调
            document.querySelector(".recpowerx").style.width = powerLevel + "%";
            document.querySelector(".recpowert").innerText = formatMs(bufferDuration, 1) + " / " + powerLevel;

            // 可视化图形绘制
            wave.input(buffers[buffers.length-1], powerLevel, bufferSampleRate);
        }
    });
    newRec.open(function(){//打开麦克风授权获得相关资源
     
      
      rec=newRec;
      
      // //此处创建这些音频可视化图形绘制浏览器支持妥妥的
      // wave=Recorder.WaveView({elem:".recwave"});
      
      console.log("已打开录音，可以点击录制开始录音了",2);
    },function(msg:any,isUserNotAllow:any){//用户拒绝未授权或不支持
      console.log((isUserNotAllow?"UserNotAllow，":"")+"打开录音失败："+msg,1);
    });
 }
  
    /**开始录音**/
  function recStart() {
  if(rec && Recorder.IsOpen()) {
      recBlob = null;
      rec.start();
      console.log("已开始录音...");
  } else {
    console.log("未打开录音", 1);
  }
};

  
  /**结束录音**/
  function recStop() {
      if(!(rec&&Recorder.IsOpen())){
        console.log("未打开录音",1);
        return;
      };
      // rec.stop(function(blob:any,duration:any){
      //   console.log(blob,(win.URL||webkitURL).createObjectURL(blob),"时长:"+duration+"ms");
        
      //   recBlob=blob;
      //   console.log("已录制mp3："+formatMs(duration)+"ms "+blob.size+"字节，可以点击播放、上传了",2);
      // },function(msg:any){
      //   console.log("录音失败:"+msg,1);
      // });
      rec.stop(function(blob, duration) {
    
          if (!blob) {
              console.error('Received blob is null or undefined');
              return;
          } else {
              console.log("sending data to backend");
              const blobSize = blob.size;
              console.log(`Blob size: ${blobSize} bytes`);
      
          }
  
          // 创建一个 FormData 对象并附加 blob
          let formData = new FormData();
          //声明了audio，sender，receiver_id，receiver为独立参数
          formData.append('file', blob, 'test.wav');
          // 使用 FormData 对象发送请求
          fetch("http://127.0.0.1:10002/record_log", {
    method: "POST",
    credentials: "same-origin",
    body: formData
})
.then(response => {
    if (!response.ok) {
        throw new Error(`Server responded with ${response.status}: ${response.statusText}`);
    }
    return response.json();
})
.then(data => {
    const recognizedText = data.recognized_text;
    // 用识别出的文字再次请求服务器
    return fetch("http://127.0.0.1:10002/chat", {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
        },
        credentials: "same-origin",
        body: JSON.stringify({
            content: recognizedText,
            sender: "Brendan",
            receiver_id: (npc as NPC).id,
            receiver: (npc as NPC).name,
        })
    });
})
.then(response => response.json())
.then(data => {
    var content = JSON.parse(data.content);
    var responseBox = this.createTextBox()
      .start(content.text, 25)
      .on("complete", () => {
        this.enableKeyboard();
        this.input.keyboard.on("keydown", () => {
          responseBox.destroy();
          this.input.keyboard.off("keydown");
          (npc as NPC).setTalking(false);
        });
      });
})
.catch(console.error);})}
  
    const self = this;
    var submitBtn = this.rexUI.add
      .label({
        x: x,
        y: y + inputText.height / scale + 5,
        background: this.rexUI.add
          .roundRectangle(0, 0, 2, 2, 20, COLOR_PRIMARY)
          .setStrokeStyle(2, COLOR_LIGHT),
        text: this.add.text(0, 0, "Submit"),
        space: {
          left: 10,
          right: 10,
          top: 10,
          bottom: 10,
        },
      })
      .setOrigin(0)
      .setScale(1 / scale, 1 / scale)
      .layout();

    var cancelBtn = this.rexUI.add
      .label({
        x: x + submitBtn.width / scale + 5,
        y: y + inputText.height / scale + 5,
        background: this.rexUI.add
          .roundRectangle(0, 0, 2, 2, 20, COLOR_PRIMARY)
          .setStrokeStyle(2, COLOR_LIGHT),
        text: this.add.text(0, 0, "Cancel"),
        space: {
          left: 10,
          right: 10,
          top: 10,
          bottom: 10,
        },
      })
      .setOrigin(0)
      .setScale(1 / scale, 1 / scale)
      .layout();

    submitBtn.onClick(function (
      click: Click,
      gameObject: Phaser.GameObjects.GameObject,
      pointer: Phaser.Input.Pointer,
      event: Phaser.Types.Input.EventData
    ) {
      let text = inputText.text;
      inputText.destroy();
      gameObject.destroy();
      cancelBtn.destroy();
      self.submitPrompt(text, npc);
    });

    cancelBtn.onClick(function (
      click: Click,
      gameObject: Phaser.GameObjects.GameObject,
      pointer: Phaser.Input.Pointer,
      event: Phaser.Types.Input.EventData
    ) {
      inputText.destroy();
      gameObject.destroy();
      submitBtn.destroy();
      self.enableKeyboard();
    });
  }

  submitPrompt(prompt: string, npc: Physics.Arcade.Sprite) {
    var waitingBox = this.createTextBox().start(
      "Waiting for the response...",
      200
    );
    var timer = this.time.addEvent({
      delay: 6000, // ms
      callback: () => {
        waitingBox.destroy();
        waitingBox = this.createTextBox().start(
          "Waiting for the response...",
          200
        );
      },
      loop: true,
    });
    fetch("http://127.0.0.1:10002/chat", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      credentials: "same-origin",
      body: JSON.stringify({
        content: prompt,
        sender: "Brendan",
        receiver_id: (npc as NPC).id,
        receiver: (npc as NPC).name,
      }),
    }).then((response) => {
      response.json().then((data) => {
        // console.log(data);
        timer.destroy();
        waitingBox.destroy();
        var content = JSON.parse(data.content);
        var responseBox = this.createTextBox()
          .start(content.text, 25)
          .on("complete", () => {
            this.enableKeyboard();
            this.input.keyboard.on("keydown", () => {
              responseBox.destroy();
              this.input.keyboard.off("keydown");
              (npc as NPC).setTalking(false);
            });
          });
      });
    });
  }

  createTextBox(): TextBox {
    var upperLeftCorner = this.cameras.main.getWorldPoint(
      this.cameras.main.width * 0.1,
      this.cameras.main.height * 0.8
    );
    var x = upperLeftCorner.x;
    var y = upperLeftCorner.y;
    var width = this.cameras.main.width * 0.8;
    var height = this.cameras.main.height * 0.15;
    var textBox = this.rexUI.add
      .textBox({
        x: x,
        y: y,
        background: this.rexUI.add.roundRectangle(
          0,
          0,
          2,
          2,
          20,
          COLOR_PRIMARY
        ),
        text: this.add
          .text(0, 0, "", {
            fixedWidth: width,
            wordWrap: {
              width: width,
            },
          })
          .setFixedSize(width, height),
        space: {
          left: 20,
          right: 20,
          top: 20,
          bottom: 20,
          icon: 10,
          text: 10,
        },
      })
      .setScale(0.25, 0.25)
      .setOrigin(0)
      .setDepth(Number.MAX_SAFE_INTEGER)
      .layout();
    return textBox;
  }

  getRandomTileAtLocation(location_name: string): TileXYType {
    var location = this.map.findObject("location", function (object) {
      return object.name == location_name;
    });
    var x = location.x;
    var y = location.y;
    var width = location.width;
    var height = location.height;
    var cnt = 0;
    debugger;
    do {
      if (cnt > 10) {
        console.log("Failed to find a random tile");
        return null;
      }
      var worldX = Math.floor(Math.random() * width) + x;
      var worldY = Math.floor(Math.random() * height) + y;
      var tile = this.board.worldXYToTileXY(worldX, worldY);
      cnt++;
    } while (
      this.board.hasBlocker(tile.x, tile.y) || // has wall
      this.board.tileXYToChessArray(tile.x, tile.y).length !=
        this.map.layers.length // has npc
    );
    return tile;
  }

  getNPCNeighbor(npc_name: string): [TileXYType, number, NPC] {
    var npc = this.npcGroup.getChildren().find((npc) => {
      return (npc as NPC).name == npc_name;
    }) as NPC;
    var npcTile = this.board.worldXYToTileXY(npc.x, npc.y);
    var directions = [
      [-1, 0],
      [1, 0],
      [0, -1],
      [0, 1],
    ];
    var order = shuffle([0, 1, 2, 3]);
    var tileX = undefined;
    var tileY = undefined;
    for (let i = 0; i < 4; i++) {
      var direction = directions[order[i]];
      var tmpX = npcTile.x + direction[0];
      var tmpY = npcTile.y + direction[1];
      if (
        !this.board.hasBlocker(tmpX, tmpY) && // no wall
        this.board.tileXYToChessArray(tmpX, tmpY).length ==
          this.map.layers.length // no npc)
      ) {
        tileX = tmpX;
        tileY = tmpY;
        break;
      }
    }
    var finalDirection = DIRECTION.DOWN;
    if (direction[0] == 0 && direction[1] == 1) {
      finalDirection = DIRECTION.UP;
    } else if (direction[0] == 0 && direction[1] == -1) {
      finalDirection = DIRECTION.DOWN;
    } else if (direction[0] == 1 && direction[1] == 0) {
      finalDirection = DIRECTION.LEFT;
    } else if (direction[0] == -1 && direction[1] == 0) {
      finalDirection = DIRECTION.RIGHT;
    }
    return [{ x: tileX, y: tileY }, finalDirection, npc];
  }

  moveNPC(
    npcId: number,
    tile,
    finalDirection: number = undefined,
    targetLocation: string = undefined,
    targetNPC: NPC = undefined
  ): void {
    var npc = this.npcGroup.getChildren()[npcId] as NPC;
    var npc_chess = this.board.worldXYToChess(npc.x, npc.y);
    this.pathFinder.setChess(npc_chess);
    // var tmp = this.board.chessToTileXYZ(npc_chess);
    var path = this.pathFinder.findPath({
      x: tile.x,
      y: tile.y,
    } as TileXYType);
    npc.setTargetNPC(targetNPC);
    npc.moveAlongPath(path, finalDirection, targetLocation);
  }
}

function getNearbyNPC(
  player: Physics.Arcade.Sprite,
  npcGroup: GameObjects.Group
): [Physics.Arcade.Sprite | null, number] {
  var nearbyObject: Physics.Arcade.Sprite | null = null;

  // Not rigorous. Just a rough estimation. Requires that the npcs have
  // similar width and height to player.
  const nearbyDistance = 1.1 * Math.max(player.width, player.height);

  var direction = 0;
  npcGroup.getChildren().forEach(function (object) {
    var _object = object as Physics.Arcade.Sprite;
    const distance = Mathph.Distance.Between(
      player.x,
      player.y,
      _object.x,
      _object.y
    );

    if (distance <= nearbyDistance) {
      nearbyObject = _object;
      var x_ratio = (player.x - _object.x) / _object.width;
      var y_ratio = (player.y - _object.y) / _object.height;
      if (Math.abs(x_ratio) > Math.abs(y_ratio)) {
        if (x_ratio > 0) {
          direction = DIRECTION.RIGHT;
        } else {
          direction = DIRECTION.LEFT;
        }
      } else {
        if (y_ratio > 0) {
          direction = DIRECTION.DOWN;
        } else {
          direction = DIRECTION.UP;
        }
      }
    }
  });

  return [nearbyObject, direction];
}
