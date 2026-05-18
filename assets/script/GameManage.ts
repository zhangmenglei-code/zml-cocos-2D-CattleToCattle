import { _decorator, Component, director, Node } from 'cc';
const { ccclass, property } = _decorator;

@ccclass('GameManage')
export class GameManage extends Component {
    private static _instance: GameManage = null;

    private _cup: number = 0; // 奖杯
    private _energy: number = 100; // 体力
    private _level: number = 1; // 关卡

    public maxEnergy: number = 100; // 最大体力

    // 数据变化的回调映射（用于 UI 更新）
    private eventTarget: Node = null;  // 作为事件派发的中介节点

    // 获取单例
    public static get instance(): GameManage {
        return GameManage._instance;
    }

    onLoad() {
        // 确保只有一个实例存在
        if (GameManage._instance) {
            this.destroy();
            return;
        }
        GameManage._instance = this;
        // 创建事件派发节点（独立于当前节点，避免被意外清理）
        this.eventTarget = new Node('GameManagerEventTarget');
        // 保持节点持久化
        director.addPersistRootNode(this.node);
        director.addPersistRootNode(this.eventTarget);
        // 初始化数据
        this.initData();
    }

    onDestroy() {
        // 清理单例引用
        if (GameManage._instance === this) {
            GameManage._instance = null;
        }
        // 清理事件派发节点
        if (this.eventTarget) {
            this.eventTarget.destroy();
        }
    }

    // 奖杯
    public get cup(): number {
        return this._cup;
    }
    public set cup(value: number) {
        if (this._cup === value) return;
        this._cup = Math.max(0, value);
        this.setData();
        this.emit('cupChanged', this._cup);
    }
    // 体力
    public get energy(): number {
        return this._energy;
    }
    public set energy(value: number) {
        if (this._energy === value) return;
        this._energy = Math.max(0, value);
        this.setData();
        this.emit('energyChanged', this._energy);
    }
    // 关卡
    public get level(): number {
        return this._level;
    }
    public set level(value: number) {
        if (this._level === value) return;
        this._level = Math.max(1, value);
        this.setData();
        this.emit('levelChanged', this._level);
    }

    // -------------- 数据公共方法 -------------
    // 增加奖杯
    public addCup(value: number = 1) {
        this.cup += value;
    }
    // 减少奖杯
    public subCup(value: number = 1) {
        if (this.cup >= value) {
            this.cup -= value;
            return true;
        }
        return false;
    }
    // 增加体力
    public addEnergy(value: number = 1) {
        this.energy += value;
    }
    // 减少体力
    public subEnergy(value: number = 1) {
        if (this.energy >= value) {
            this.energy -= value;
            return true;
        }
        return false;
    }
    // 增加关卡
    public addLevel(value: number = 1) {
        this.level += value;
    }

    // ------------- 初始化数据 -------------
    initData() {
        const gameData = localStorage.getItem('gameData');
        if (gameData) {
            const data = JSON.parse(gameData);
            this._cup = data.cup ?? 0;
            this._energy = data.energy ?? this.maxEnergy;
            this._level = data.level ?? 1;
        }
        // 发送数据变化事件
        this.emit('cupChanged', this._cup); // 奖杯
        this.emit('energyChanged', this._energy); // 体力
        this.emit('levelChanged', this._level); // 关卡
    }

    // 存储数据
    setData() {
        const gameData = {
            cup: this._cup,
            energy: this._energy,
            level: this._level
        }
        localStorage.setItem('gameData', JSON.stringify(gameData));
    }

    // ---------- 事件派发（让 UI 或其他模块监听）----------
    /**
     * 监听游戏数据变化
     * @param event 事件名
     * @param callback 回调函数，参数为新的值
     */
    public on(event: string, callback: Function, target?: any) {
        this.eventTarget.on(event, callback, target);
    }

    public off(event: string, callback: Function, target?: any) {
        this.eventTarget.off(event, callback, target);
    }

    private emit(event: string, value: any) {
        this.eventTarget.emit(event, value);
    }

    start() {
    }

    update(deltaTime: number) {
        
    }

    // 开始游戏
    startGame() {
        // 跳转到游戏场景
        director.loadScene('scene-level');
    }
}


