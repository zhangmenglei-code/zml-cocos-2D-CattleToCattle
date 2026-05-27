import { _decorator, Component, Label, Node } from 'cc';
import { GameManage } from './GameManage';
const { ccclass, property } = _decorator;

@ccclass('HomeUiManage')
export class HomeUiManage extends Component {
    // 开始游戏按钮
    @property({type: Node, tooltip: '开始游戏按钮节点'})
    private startBtnNode: Node = null;
    // 生存模式按钮
    @property({type: Node, tooltip: '生存模式按钮节点'})
    private survivalBtnNode: Node = null;
    // 体力
    @property({type: Label, tooltip: '体力显示节点'})
    private energyLabel: Label = null;
    // 关卡
    @property({type: Label, tooltip: '关卡显示节点'})
    private levelLabel: Label = null;

    // 生存次数
    @property({type: Label, tooltip: '生存次数显示节点'})
    private survivalLabel: Label = null;

    onLoad() {
        // 初始化开始游戏按钮点击事件
        this.startBtnNode.on(Node.EventType.TOUCH_END, this.startGame, this);
        // 初始化生存模式按钮点击事件
        this.survivalBtnNode.on(Node.EventType.TOUCH_END, this.startSurvivalMode, this);
    }

    onDestroy() {
        if (GameManage.instance !== null) {
            GameManage.instance.off('energyChanged', this.updateEnergy, this);
            GameManage.instance.off('levelChanged', this.updateLevel, this);
            GameManage.instance.off('survivalChanged', this.updateSurvival, this);
        }
    }

    // 初始化生存模式按钮点击事件
    start() {
        if (GameManage.instance !== null) {
            GameManage.instance.on('energyChanged', this.updateEnergy, this);
            GameManage.instance.on('levelChanged', this.updateLevel, this);
            GameManage.instance.on('survivalChanged', this.updateSurvival, this);
            this.updateEnergy(GameManage.instance.energy);
            this.updateLevel(GameManage.instance.level);
            this.updateSurvival(GameManage.instance.survival);
        }
    }

    // 更新体力显示
    private updateEnergy(value: number) {
        this.energyLabel.string = `${value}/${GameManage.instance.maxEnergy}`;
    }
    // 更新关卡显示
    private updateLevel(value: number) {
        this.levelLabel.string = `第 ${value} 关`;
    }
    // 更新生存次数显示
    private updateSurvival(value: number) {
        this.survivalLabel.string = `今日免费 ${value}/2 次`;
    }

    // 开始游戏按钮点击事件
    private startGame() {
        GameManage.instance.startGame(1);
    }

    // 生存模式按钮点击事件
    private startSurvivalMode() {
        GameManage.instance.startGame(2);
    }
}


