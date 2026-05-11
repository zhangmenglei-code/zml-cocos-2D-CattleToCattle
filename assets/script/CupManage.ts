import { _decorator, Component, Label, Node } from 'cc';
import { GameManage } from './GameManage';
const { ccclass, property } = _decorator;

@ccclass('CupManage')
export class CupManage extends Component {
    // 奖杯
    @property({type: Label})
    private cupLabel: Label = null;

    start() {
        if (GameManage.instance !== null) {
            GameManage.instance.on('cupChanged', this.updateCup, this);
            this.updateCup(GameManage.instance.cup);
        }
    }

    onDestroy() {
        if (GameManage.instance !== null) {
            GameManage.instance.off('cupChanged', this.updateCup, this);
        }
    }

    update(deltaTime: number) {
        
    }

    private updateCup(value: number) {
        this.cupLabel.string = `${value}`;
    }
}


