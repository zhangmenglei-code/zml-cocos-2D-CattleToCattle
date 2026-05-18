import { _decorator, AudioSource, CCInteger, Component, director, instantiate, Label, Node, Prefab } from 'cc';
const { ccclass, property } = _decorator;

@ccclass('LevelManage')
export class LevelManage extends Component {
    // 生命预载体
    @property(Prefab)
    private hpPrefab: Prefab = null;
    // 生命值盒子节点
    @property(Node)
    private hpBoxNode: Node = null;

    // 剩余小新展示节点
    @property({ type: Label, tooltip: '剩余小新数量展示节点' })
    private remainXinLabel: Label = null;

    // 小新的总数量 = 行数 = 列数
    @property({type: CCInteger, min: 4, max: 12, tooltip: '小新数量（>=4）'})
    public xinNum: number = 4;

    // 小新的笑声音效
    @property(AudioSource)
    private xinSound: AudioSource = null;
    // 小新点击错误的音效
    @property(AudioSource)
    private xinErrorSound: AudioSource = null;

    // 当前关卡通关音效
    @property({ type: AudioSource, tooltip: '当前关卡通关音效' })
    private levelWinSound: AudioSource = null;

    // 当前关卡失败音效
    @property({ type: AudioSource, tooltip: '当前关卡失败音效' })
    private levelLoseSound: AudioSource = null;

    // 游戏失败节点
    @property(Node)
    private loseNode: Node = null;

    private _hp: number = 3; // 生命值

    onLoad() {
        // 剩余小新数量展示节点
        this.remainXinLabel.string = this.xinNum.toString();
        // 渲染生命值
        this.renderHp();
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
            // 游戏暂停
            director.pause();
            // 显示游戏失败节点
            this.loseNode.active = true;
            // 播放游戏失败音效
            this.levelLoseSound.play();
        } else {
            this.xinErrorSound.play();
        }
    }

    // 增加生命值
    public increaseHp() {
        this._hp++;
        this.renderHp();
    }

    // 减少小新
    public decreaseXin() {
        this.xinNum--;
        this.remainXinLabel.string = this.xinNum.toString();
        this.xinSound.play();
    }

    // 返回主界面
    backToMain() {
        // 恢复游戏
        director.resume();
        // 跳转到主界面
        director.loadScene('scene-home');
    }

    // 重新加载当前关卡
    reLoadLevel() {
        // 恢复游戏
        director.resume();
        // 隐藏失败节点
        this.loseNode.active = false;
        // 跳转到当前关卡
        director.loadScene(director.getScene().name);
    }
}


