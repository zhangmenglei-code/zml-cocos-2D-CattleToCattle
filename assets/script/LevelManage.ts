import { _decorator, CCInteger, Component, instantiate, Label, Node, Prefab } from 'cc';
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
    decreaseHp() {
        this._hp--;
        this.renderHp();
    }
    // 增加生命值
    increaseHp() {
        this._hp++;
        this.renderHp();
    }
}


