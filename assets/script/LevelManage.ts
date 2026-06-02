import { _decorator, AudioSource, Component, director, instantiate, Label, Node, Prefab } from 'cc';
const { ccclass, property } = _decorator;
import { GameManage } from './GameManage';
import { GameUiManage } from './GameUiManage';

@ccclass('LevelManage')
export class LevelManage extends Component {
    private static _instance: LevelManage = null;
    // 关卡Label
    @property({ type: Label, tooltip: '关卡Label' })
    private levelLabel: Label = null;
    // 生命预载体
    @property(Prefab)
    private hpPrefab: Prefab = null;
    // 生命值盒子节点
    @property(Node)
    private hpBoxNode: Node = null;

    // 剩余小新展示节点
    @property({ type: Label, tooltip: '剩余小新数量展示节点' })
    private remainXinLabel: Label = null;

    // 小新的笑声音效
    @property(AudioSource)
    public xinSound: AudioSource = null;
    // 小新点击错误的音效
    @property(AudioSource)
    private xinErrorSound: AudioSource = null;

    // 当前关卡通关音效
    @property({ type: AudioSource, tooltip: '当前关卡通关音效' })
    private levelWinSound: AudioSource = null;

    // 当前关卡失败音效
    @property({ type: AudioSource, tooltip: '当前关卡失败音效' })
    private levelLoseSound: AudioSource = null;

    // 游戏失败弹框节点
    @property({ type: Node, tooltip: '游戏失败弹框节点' })
    private loseNode: Node = null;
    // 游戏成功弹框节点
    @property({ type: Node, tooltip: '游戏成功弹框节点' })
    private winNode: Node = null;

    // 设置弹框节点
    @property({ type: Node, tooltip: '设置弹框节点' })
    private settingPanelNode: Node = null;

    // 风间的音频
    @property(AudioSource)
    private fengjianSound: AudioSource = null;
    // 妮妮的音频
    @property(AudioSource)
    private niniSound: AudioSource = null;
    // 阿呆的音频
    @property(AudioSource)
    private adaiSound: AudioSource = null;
    // 正南的音频
    @property(AudioSource)
    private zhengnanSound: AudioSource = null;

    public _xinNum: number = 4; // 小新数量（根据关卡来决定，最少4，最多12）
    public _hp: number = 3; // 生命值
    public _findXin: number = 2; // 已找到的小新数量

    public isEnd: boolean = false; // 当前关卡是否结束

    // 获取单例
    public static get instance(): LevelManage {
        return LevelManage._instance;
    }

    onLoad() {
        // 确保只有一个实例存在
        if (LevelManage._instance) {
            this.node.destroy();
            return;
        }
        LevelManage._instance = this;
        // 初始化小新数量
        this._xinNum = GameManage.instance?.xinNum;
        // 初始化已找到的小新数量
        this._findXin = Math.floor(this._xinNum / 2)
        // 初始化关卡Label
        this.levelLabel.string = '第' + GameManage.instance?.level + '关';
        // 剩余小新数量展示节点
        this.remainXinLabel.string = (this._xinNum - this._findXin).toString();
        // 渲染生命值
        this.renderHp();
        // 监听设置按钮点击事件
        this.settingPanelNode.on(Node.EventType.TOUCH_END, this.showSettingPanel, this);
    }

    onDestroy() {
        // 清理单例引用
        if (LevelManage._instance === this) {
            LevelManage._instance = null;
        }
    }

    // 渲染生命值
    private renderHp() {
        // 清除旧生命值节点
        this.hpBoxNode.removeAllChildren();
        // 创建新生命值节点
        // 默认第一个生命值x位置是 -50，每个生命值间隔50
        for (let i = 0; i < this._hp; i++) {
            let hpNode = instantiate(this.hpPrefab);
            hpNode.parent = this.hpBoxNode;
            hpNode.setPosition(-50 + i * 50, 0);
        }
    }

    // 减少生命值
    public decreaseHp() {
        this._hp--;
        this.renderHp();
        if (this._hp <= 0) {
            // 生命值为0，游戏失败
            this.isEnd = true;
            // 停止小新错误音效
            this.xinErrorSound.stop()
            // 游戏暂停
            director.pause();
            // 显示游戏失败节点
            this.loseNode.active = true;
            // 播放游戏失败音效
            this.levelLoseSound.play();
            // 如果是生存模式，则不展示重试按钮，并且退出按钮居中
            if (GameManage.instance.gameType === 2) {
                this.loseNode.getChildByName('ResetGame').active = false;
                this.loseNode.getChildByName('ReturnHome').setPosition(0, -350);
            }

        } else {
            this.xinErrorSound.play();
        }
    }

    // 增加生命值
    public increaseHp() {
        if (this._hp === 3) { 
            return;
        }
        this._hp++;
        this.renderHp();
    }

    // 减少小新
    public decreaseXin() {
        this._xinNum--;
        this.remainXinLabel.string = this._xinNum.toString();
        // 检查是否结束
        if (this._xinNum <= 0) {
            this.isEnd = true;
            // 游戏暂停
            // director.pause();
            // 播放通关音效
            this.levelWinSound.play();
            // 显示成功节点
            this.winNode.active = true;
            // 如果是生存模式，则不展示下一关按钮，并且返回主页居中
            if (GameManage.instance.gameType === 2) {
                this.winNode.getChildByName('NextLevel').active = false;
                this.winNode.getChildByName('BackBtn').setPosition(0, -350);
            }
            // 增加关卡
            GameManage.instance.addLevel()
            // 增加奖杯
            GameManage.instance.addCup();
            // 当前关卡通关，增加体力
            GameManage.instance.addEnergy();
        } else {
            // 播放小新音效
            this.xinSound.play();
        }
    }

    // 返回主界面
    backToMain() {
        // 初始化数据
        GameManage.instance.initData();
        // 恢复游戏
        director.resume();
        // 跳转到主界面
        director.loadScene('scene-home');
    }

    // 重试当前关卡
    reLoadLevel() {
        // 检测体力
        if (GameManage.instance && GameManage.instance.subEnergy()) {
            // 恢复游戏
            director.resume();
            // 隐藏失败节点
            this.loseNode.active = false;
            // 跳转到当前关卡
            director.loadScene(director.getScene().name);
        } else {
            // 体力不足
        }
    }

    // 下一关
    nextLevel() {
        if (GameManage.instance && GameManage.instance.subEnergy()) {
            // 恢复游戏
            director.resume();
            // 跳转到下一关
            director.loadScene('scene-level');   
        } else {
            // 体力不足
        }
    }

    // 设置按钮点击事件
    private showSettingPanel() {
        GameUiManage.instance.showSettingPanel();
    }

    // 呼叫风间
    public callFengjian() {
        GameUiManage.instance.showToast('太过分了，怎么可以用道具啊！');
        this.fengjianSound.play();
    }

    // 呼叫妮妮
    public callNinni() {
        GameUiManage.instance.showToast('真是没用！');
        this.niniSound.play();
    }

    // 呼叫阿呆
    public callAdai() {
        GameUiManage.instance.showToast('呆~~~');
        this.adaiSound.play();
    }

    // 呼叫正南
    public callZhengnan() {
        GameUiManage.instance.showToast('真的太难了啦');
        this.zhengnanSound.play();
    }
}


