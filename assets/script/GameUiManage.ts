import { _decorator, Component, director, Label, Node } from 'cc';
import { GameManage } from './GameManage';
const { ccclass, property } = _decorator;

@ccclass('GameUiManage')
export class GameUiManage extends Component {
    // 体力
    @property({type: Label})
    private energyLabel: Label = null;
    // 关卡
    @property({type: Label})
    private levelLabel: Label = null;

    onLoad() {
    }

    onDestroy() {
        GameManage.instance.off('energyChanged', this.updateEnergy, this);
        GameManage.instance.off('levelChanged', this.updateLevel, this);
    }

    start() {
        if (GameManage.instance !== null) {
            GameManage.instance.on('energyChanged', this.updateEnergy, this);
            GameManage.instance.on('levelChanged', this.updateLevel, this);
            this.updateEnergy(GameManage.instance.energy);
            this.updateLevel(GameManage.instance.level);
        }
    }

    update(deltaTime: number) {
        
    }

    private updateEnergy(value: number) {
        this.energyLabel.string = `${value} / ${GameManage.instance.maxEnergy}`;
    }
    private updateLevel(value: number) {
        this.levelLabel.string = `第 ${value} 关`;
    }
}


