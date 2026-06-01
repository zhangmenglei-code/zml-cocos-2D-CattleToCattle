import { _decorator, Component, director, find, instantiate, Label, Node, Prefab, resources } from 'cc';
const { ccclass, property } = _decorator;

@ccclass('GameUiManage')
export class GameUiManage extends Component {
    // 设置弹框预载体
    @property({type: Prefab, tooltip: "设置弹框预载体"})
    settingPanelPrefab: Prefab = null;
    // toast提示预载体
    @property({type: Prefab, tooltip: "toast提示预载体"})
    toastPrefab: Prefab = null;


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
    public showSettingPanel() {
        const canvas = find("Canvas");
        if (!canvas) return;
        const dialogNode = instantiate(this.settingPanelPrefab);
        canvas.addChild(dialogNode);
        dialogNode.setSiblingIndex(canvas.children.length - 1);
        dialogNode.active = true;
        // 如果当前场景是scene-home，则隐藏弹框内的退出按钮
        if (director.getScene().name === "scene-home") {
            dialogNode.getChildByName("BackBtn").active = false;
        } else {
            // 监听退出按钮点击事件
            dialogNode.getChildByName("BackBtn").on(Node.EventType.TOUCH_END, this.backHome, this);
        }
        // 监听关闭按钮点击事件
        dialogNode.getChildByName("CloseBtn").on(Node.EventType.TOUCH_END, this.hideSettingPanel, this);
    }

    // 隐藏设置面板
    public hideSettingPanel() {
        if (!find("Canvas/SettingPanel")) return;
        find("Canvas/SettingPanel").destroy();
    }

    // 退出按钮点击事件
    private backHome() {
        director.loadScene('scene-home');
    }

    // toast提示显示
    public showToast(msg: string) {
        const canvas = find("Canvas");
        if (!canvas) return;
        const toastNode = instantiate(this.toastPrefab);
        canvas.addChild(toastNode);
        toastNode.setSiblingIndex(canvas.children.length - 1);
        toastNode.getChildByName("Message").getComponent(Label).string = msg;
    }
}


