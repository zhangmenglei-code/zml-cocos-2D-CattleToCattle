import { _decorator, Component, director, Label, Node } from 'cc';
const { ccclass, property } = _decorator;

@ccclass('GameUiManage')
export class GameUiManage extends Component {
    // 设置弹框
    @property({type: Node, tooltip: '设置弹框预载体节点'})
    private setUpDialogNode: Node = null;

    //单例
    private static _instance: GameUiManage = null;
    // 获取单例
    public static get instance(): GameUiManage {
        return GameUiManage._instance;
    }

    onLoad() {
        // 确保只有一个实例存在
        if (GameUiManage._instance) {
            this.node.destroy();
            return;
        }
        GameUiManage._instance = this;
        // 保持节点持久化
        director.addPersistRootNode(this.node);
    }

    onDestroy() {
        // 清理单例引用
        if (GameUiManage._instance === this) {
            GameUiManage._instance = null;
        }
    }

    // 设置弹框显示
    private setPopupVisible(visible: boolean) {
        this.setUpDialogNode.active = visible;
    }
}


