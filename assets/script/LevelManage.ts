import { _decorator, Component, instantiate, Node, Prefab } from 'cc';
const { ccclass, property } = _decorator;

@ccclass('LevelManage')
export class LevelManage extends Component {
    // 生命预载体
    @property(Prefab)
    private hpPrefab: Prefab = null;
    // 生命值盒子节点
    @property(Node)
    private hpBoxNode: Node = null;

    private _hp: number = 3; // 生命值

    onLoad() {
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
    decreaseHp() {
        this._hp--;
        this.renderHp();
    }

    start() {
    }

    update(deltaTime: number) {
    }
}


