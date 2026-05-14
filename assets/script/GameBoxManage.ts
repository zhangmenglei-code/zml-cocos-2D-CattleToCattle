import { _decorator, Color, Component, EventTouch, instantiate, Label, Node, Prefab, Sprite, UITransform, Vec2, Vec3 } from 'cc';
const { ccclass, property } = _decorator;
import { LevelManage } from './LevelManage';

// 颜色组
const colorGroup = [
    '#AE6D45',
    '#C5668E',
    '#A5BDD7',
    '#48B4B4',
    '#E1BA45',
    '#69BCE8',
    '#9078CE',
    '#ABD893',
    '#E7A8C1',
    '#6082B7',
    '#FFA6E7',
    '#FDA872'
];

@ccclass('GameBoxManage')
export class GameBoxManage extends Component {
    @property(LevelManage)
    public levelManage: LevelManage = null;
    // 子节点预载体
    @property(Prefab)
    private BoxItemPrefab: Prefab = null;

    // 小新的数量 = 行数 = 列数
    private BoxItemRows: number = 0;
    private BoxItemCols: number = 0;

    private buttonSpacing: number = 10; // 按钮之间的间隙

    doubleClickDelay: number = 200 // 双击判定时间

    private moveThresholdSq: number = 100 // 移动阈值平方

    // 按钮数据
    private buttonData: any[] = [];   // 数据数组，二维数组
    private buttonNodes: any[] = [];  // 生成的按钮节点（与数据索引对应）
    private buttonLabels: any[] = []; // 对应的 Label 组件

    // 触摸状态
    private touchStartPos: Vec2 = new Vec2(); // 触摸开始位置
    private hasMovedExceedThreshold: boolean = false; // 是否超出移动阈值
    private currentHoverButton: Node | null = null; // 当前悬停的按钮节点

    // 双击/单击状态
    private lastClickTime: number = 0; // 上次点击时间
    private lastClickButton: Node | null = null; // 上次点击的按钮节点
    private clickTimer: any = null; // 单击计时器
    private isWaitingForDoubleClick: boolean = false; // 是否等待双击

    // 节点到行列的映射（用于快速查找）
    private nodeToPosMap: Map<Node, { row: number, col: number }> = new Map();

    onLoad() {
        // 小新的数量 = 行数 = 列数
        this.BoxItemRows = this.levelManage.xinNum;
        this.BoxItemCols = this.levelManage.xinNum;
        // 初始化按钮数据
        this.initButtonData();
        // 生成按钮节点
        this.generateButtons();
        // 注册事件
        this.registerEvents();
    }

    onDestroy() {
        this.unregisterEvents();
        if (this.clickTimer) {
            clearTimeout(this.clickTimer);
            this.clickTimer = null;
        }
    }

    // 初始化按钮数据
    private initButtonData() {
        // 1、 初始化按钮数据
        for (let row = 0; row < this.BoxItemRows; row++) {
            this.buttonData[row] = [];
            for (let col = 0; col < this.BoxItemCols; col++) {
                this.buttonData[row][col] = {
                    row: row,
                    col: col,
                    status: 0, // 0表示什么都没有，1表示单击（标记X），2表示双击（标记小新）
                    isXin: false, // 是否存在小新
                    color: '' // 按钮颜色
                }
            }
        }
        // 2、小新的位置
        // 随机颜色
        const colors = colorGroup.sort(() => Math.random() - 0.5).slice(0, this.levelManage.xinNum);
        // 随机符合小新放置条件的坐标数组
        const resultsArr = this.getRandomNonAdjacentQueens(this.levelManage.xinNum);
        // 把小新插入到数据中
        for (let i = 0; i < resultsArr.length; i++) {
            const { row, col } = resultsArr[i];
            this.buttonData[row][col].isXin = true;
            this.buttonData[row][col].color = colors[i];
        }

        // 3、处理空白节点
        const [xinDatas, blankDatas] = this.getXinDatas();
        // 随机一个小新不需要进行颜色渲染
        const randomIndex = Math.floor(Math.random() * xinDatas.length);
        const xinDatasList = xinDatas.filter((item, index) => index !== randomIndex);
        // 这个小新需要首次渲染时，就是翻开的
        const randomXin = xinDatas[randomIndex];
        this.buttonData[randomXin.row][randomXin.col].status = 2;
        // 处理空白节点，当前节点的颜色就是离它最近的小新节点的颜色
        for (let i = 0; i < blankDatas.length; i++) {
            const currentNode = blankDatas[i]
            const targetNode = this.findClosestNode(currentNode, xinDatasList);
            this.buttonData[currentNode.row][currentNode.col].color = targetNode.color ?? '#000000';
        }
    }

    // 从二维数组中，找到所有的小新节点、空白节点数组
    private getXinDatas() {
        const xinDatas = [];
        const blankDatas = [];
        for (let row = 0; row < this.BoxItemRows; row++) {
            for (let col = 0; col < this.BoxItemCols; col++) {
                if (this.buttonData[row][col].isXin) {
                    xinDatas.push(this.buttonData[row][col]);
                } else {
                    blankDatas.push(this.buttonData[row][col]);
                }
            }
        }
        return [xinDatas, blankDatas];
    }

    // 生成按钮节点
    private generateButtons() {
        const container = this.node;
        const containerTransform = container.getComponent(UITransform); // 获取容器的 UITransform 组件
        const containerWidth = containerTransform.width;
        const containerHeight = containerTransform.height;

        // 计算每个按钮的宽高（留一些内边距，例如左右上下各留 20px）
        const padding = 20;
        const availableWidth = containerWidth - padding * 2;
        const availableHeight = containerHeight - padding * 2;

        const btnWidth = (availableWidth - (this.buttonSpacing * (this.BoxItemCols - 1))) / this.BoxItemCols;
        const btnHeight = (availableHeight - (this.buttonSpacing * (this.BoxItemRows - 1))) / this.BoxItemRows;

        // 起始点坐标（左下角为原点，计算时需转换到中心锚点）
        const startX = -containerWidth / 2 + padding + btnWidth / 2;
        const startY = containerHeight / 2 - padding - btnHeight / 2;

        // 先清空旧按钮节点
        container.removeAllChildren();
        for (let row = 0; row < this.BoxItemRows; row++) {
            this.buttonNodes[row] = [];
            this.buttonLabels[row] = [];
            for (let col = 0; col < this.BoxItemCols; col++) {
                const btnNode = instantiate(this.BoxItemPrefab);
                btnNode.parent = container;

                // 设置位置
                const x = startX + col * (btnWidth + this.buttonSpacing);
                const y = startY - row * (btnHeight + this.buttonSpacing);
                btnNode.setPosition(x, y, 0);

                // 设置尺寸
                const btnTransform = btnNode.getComponent(UITransform);
                if (btnTransform) {
                    btnTransform.setContentSize(btnWidth, btnHeight);
                }

                // 设置颜色
                const btnSprite = btnNode.getComponent(Sprite);
                if (btnSprite) {
                    btnSprite.color = new Color(this.buttonData[row][col].color);
                }

                // 获取 Label 并更新文本
                // const label = btnNode.getComponentInChildren(Label);
                // label.string = this.buttonData[row][col].isXin ? 'X' : this.buttonData[row][col].status.toString();
                
                // 如果是小新并且是双击状态，则展示小新图片
                if (this.buttonData[row][col].isXin && this.buttonData[row][col].status === 2) {
                    btnNode.getChildByName('Xin').active = true;
                    // 设置它的宽高为按钮的80%
                    const xinTransform = btnNode.getChildByName('Xin').getComponent(UITransform);
                    if (xinTransform) {
                        xinTransform.setContentSize(btnWidth * 0.7, btnHeight * 0.7);
                    }
                }

                // 保存 Label节点 和 按钮节点
                // this.buttonLabels[row][col] = label;
                this.buttonNodes[row][col] = btnNode;

                // 存储节点到行列的映射
                this.nodeToPosMap.set(btnNode, { row: row, col: col });
            }
        }
    }

    // ---------- 辅助：根据世界坐标查找按钮节点 ----------
    private getButtonAtWorldPos(worldPos: Vec2): any {
        for (let row = 0; row < this.BoxItemRows; row++) {
            for (let col = 0; col < this.BoxItemCols; col++) {
                const btn = this.buttonNodes[row][col];
                // 跳过不存在的按钮
                if (!btn) continue;
                const uiTransform = btn.getComponent(UITransform);
                // 如果没有 UITransform 组件，无法进行坐标转换，跳过
                if (!uiTransform) continue;
                // 转换世界坐标到节点坐标
                const localPos = uiTransform.convertToNodeSpaceAR(new Vec3(worldPos.x, worldPos.y, 0));
                const rect = uiTransform.getBoundingBox();
                // 判断 localPos 是否在按钮的矩形范围内
                if (
                    localPos.x >= -rect.width / 2 &&
                    localPos.x <= rect.width / 2 &&
                    localPos.y >= -rect.height / 2 &&
                    localPos.y <= rect.height / 2
                ) {
                    return btn;
                }
            }
        }
        return null;
    }

    // ---------- 更新按钮显示及数据状态 ----------
    private updateButtonStatus(row: number, col: number, newStatus: 0 | 1 | 2) {
        
    }

    // 双击处理
    private onDoubleClick(btnNode: Node) {
        const pos = this.nodeToPosMap.get(btnNode);
        if (pos) {
            this.updateButtonStatus(pos.row, pos.col, 2);
        }
    }

    // 单击处理
    private onSingleClick(btnNode: Node) {
        const pos = this.nodeToPosMap.get(btnNode);
        if (pos) {
            const { row, col } = pos;
            // 如果当前节点已经是双击状态，且是小新，则不更新
            if (this.buttonData[row][col].status === 2 && this.buttonData[row][col].isXin) {
                return;
            }
            // 处理按钮上的节点
            const btnNode = this.buttonNodes[row][col];
            const xinTransform = btnNode.getChildByName('X').getComponent(Animation);
            if (this.buttonData[row][col].status === 0) {
                // 如果是单击，则展示按钮的X节点，并播放动画
                this.buttonData[row][col].status = 1
                btnNode.getChildByName('X').active = true;
                if (xinTransform) {
                    xinTransform.play();
                }
            } else {
                // 如果已经展示了X节点，则隐藏X节点，并停止动画
                this.buttonData[row][col].status = 0
                if (xinTransform) {
                    xinTransform.stop();
                }
                btnNode.getChildByName('X').active = false;
            }
        }
    }

    // 滑动经过处理
    private onHoverEnter(btnNode: Node) {
        const pos = this.nodeToPosMap.get(btnNode);
        if (pos) {
            this.onSingleClick(btnNode);
        }
    }

    // 注册事件
    registerEvents() {
        this.node.on(Node.EventType.TOUCH_START, this.onTouchStart, this);
        this.node.on(Node.EventType.TOUCH_MOVE, this.onTouchMove, this);
        this.node.on(Node.EventType.TOUCH_END, this.onTouchEnd, this);
        this.node.on(Node.EventType.TOUCH_CANCEL, this.onTouchCancel, this);
    }
    // 注销事件
    private unregisterEvents() {
        this.node.off(Node.EventType.TOUCH_START, this.onTouchStart, this);
        this.node.off(Node.EventType.TOUCH_MOVE, this.onTouchMove, this);
        this.node.off(Node.EventType.TOUCH_END, this.onTouchEnd, this);
        this.node.off(Node.EventType.TOUCH_CANCEL, this.onTouchCancel, this);
    }

    // ---------- 触摸事件实现 ----------
    private onTouchStart(event: EventTouch) {
        const touchPos = event.getUILocation();
        this.touchStartPos.set(touchPos.x, touchPos.y);
        this.hasMovedExceedThreshold = false;

        const currentBtn = this.getButtonAtWorldPos(touchPos);
        if (!currentBtn) return;

        const now = Date.now();

        // 双击判定
        // 检查是否正在等待双击，且点击的按钮与上一次相同，且移动未超过阈值，且时间间隔在双击判定范围内
        if (
            this.isWaitingForDoubleClick &&
            this.lastClickButton === currentBtn &&
            (now - this.lastClickTime) < this.doubleClickDelay &&
            !this.hasMovedExceedThreshold
        ) {
            if (this.clickTimer) {
                clearTimeout(this.clickTimer);
                this.clickTimer = null;
            }
            this.isWaitingForDoubleClick = false;
            this.onDoubleClick(currentBtn);
            this.lastClickButton = null;
            this.lastClickTime = 0;
            return;
        }

        // 准备可能的单击
        if (this.clickTimer) {
            clearTimeout(this.clickTimer);
            this.clickTimer = null;
        }
        this.isWaitingForDoubleClick = true;
        this.lastClickButton = currentBtn;
        this.lastClickTime = now;

        this.clickTimer = setTimeout(() => {
            // 单击判定：如果仍在等待双击且未超过移动阈值，则执行单击逻辑
            if (this.isWaitingForDoubleClick && !this.hasMovedExceedThreshold) {
                this.onSingleClick(currentBtn);
            }
            this.isWaitingForDoubleClick = false;
            this.clickTimer = null;
        }, this.doubleClickDelay);
    }

    // 触摸移动
    private onTouchMove(event: EventTouch) {
        const touchPos = event.getUILocation();
        const currentBtn = this.getButtonAtWorldPos(new Vec2(touchPos.x, touchPos.y));

        // 检测移动是否超过阈值
        const dx = touchPos.x - this.touchStartPos.x;
        const dy = touchPos.y - this.touchStartPos.y;
        const distSq = dx * dx + dy * dy;
        if (!this.hasMovedExceedThreshold && distSq >= this.moveThresholdSq) {
            this.hasMovedExceedThreshold = true;
            if (this.clickTimer) {
                clearTimeout(this.clickTimer);
                this.clickTimer = null;
                this.isWaitingForDoubleClick = false;
                this.lastClickButton = null;
            }
        }

        // 滑动经过：进入新按钮区域时改变状态
        if (currentBtn && currentBtn !== this.currentHoverButton) {
            this.onHoverEnter(currentBtn);
            this.currentHoverButton = currentBtn;
        } else if (!currentBtn) {
            this.currentHoverButton = null;
        }
    }

    // 触摸结束
    private onTouchEnd(event: EventTouch) {
        // 检查是否移动超过阈值
        if (this.hasMovedExceedThreshold) {
            if (this.clickTimer) {
                clearTimeout(this.clickTimer);
                this.clickTimer = null;
            }
            this.isWaitingForDoubleClick = false;
            this.lastClickButton = null;
        }
        this.currentHoverButton = null;
    }

    // 触摸取消
    private onTouchCancel(event: EventTouch) {
        if (this.clickTimer) {
            clearTimeout(this.clickTimer);
            this.clickTimer = null;
        }
        this.isWaitingForDoubleClick = false;
        this.hasMovedExceedThreshold = false;
        this.lastClickButton = null;
        this.currentHoverButton = null;
    }

    // --------------------------- 算法逻辑 ---------------------------
    // 回溯算法 - 八皇后问题
    /**
     * 生成 N×N 宫格中所有满足以下条件的皇后坐标集合：
     * 1. 每行每列恰好一个皇后
     * 2. 任意两个皇后的八个相邻方向（包括对角线）上无其他皇后
     * @param n 棋盘大小（行数=列数=皇后数）
     * @returns 所有解的数组，每个解是一个坐标对象数组 [{row, col}, ...]
     */
    private generateNonAdjacentQueens(n: number): { row: number; col: number }[][] {
        // 已知无解的情况
        if (n === 2 || n === 3) return [];
        if (n === 1) return [[{ row: 0, col: 0 }]];

        const solutions: number[][] = [];          // 存储每行皇后所在列的索引
        const cols: boolean[] = Array(n).fill(false);
        const diag1: boolean[] = Array(2 * n - 1).fill(false); // r - c + n - 1
        const diag2: boolean[] = Array(2 * n - 1).fill(false); // r + c
        const queensCol: number[] = [];

        function backtrack(row: number): void {
            if (row === n) {
                solutions.push([...queensCol]);
                return;
            }
            for (let col = 0; col < n; col++) {
                if (cols[col]) continue;
                const d1 = row - col + n - 1;
                const d2 = row + col;
                if (diag1[d1] || diag2[d2]) continue;

                // 标准 N 皇后已经禁止了同一对角线（包括相邻对角线），无需额外判断
                cols[col] = true;
                diag1[d1] = true;
                diag2[d2] = true;
                queensCol.push(col);
                backtrack(row + 1);
                queensCol.pop();
                cols[col] = false;
                diag1[d1] = false;
                diag2[d2] = false;
            }
        }
        backtrack(0);
        // 将列索引数组转换为坐标对象数组
        return solutions.map(solution => solution.map((col, row) => ({ row, col })));
    }

    // 同上 - 回溯算法 - 随机获取一个符合条件的
    private getRandomNonAdjacentQueens(n: number): { row: number; col: number }[] | null {
        if (n === 2 || n === 3) return null;
        if (n === 1) return [{ row: 0, col: 0 }];

        const cols: boolean[] = Array(n).fill(false);
        const diag1: boolean[] = Array(2 * n - 1).fill(false);
        const diag2: boolean[] = Array(2 * n - 1).fill(false);
        const queensCol: number[] = [];

        function backtrack(row: number): boolean {
            if (row === n) return true;
            // 随机打乱列顺序，以随机获取一个解
            const order = Array.from({ length: n }, (_, i) => i);
            for (let i = order.length - 1; i > 0; i--) {
                const j = Math.floor(Math.random() * (i + 1));
                [order[i], order[j]] = [order[j], order[i]];
            }
            for (const col of order) {
                if (cols[col]) continue;
                const d1 = row - col + n - 1;
                const d2 = row + col;
                if (diag1[d1] || diag2[d2]) continue;
                cols[col] = true;
                diag1[d1] = true;
                diag2[d2] = true;
                queensCol.push(col);
                if (backtrack(row + 1)) return true;
                queensCol.pop();
                cols[col] = false;
                diag1[d1] = false;
                diag2[d2] = false;
            }
            return false;
        }

        if (backtrack(0)) {
            return queensCol.map((col, row) => ({ row, col }));
        }
        return null;
    }

    /**
     * 从节点列表中找出距离当前节点最近的一个节点（欧氏距离）
     * @param currentNode 当前节点，包含 row, col 坐标
     * @param otherNodeList 其他节点数组，每个包含 row, col 坐标
     * @returns 距离最近的节点对象（若列表为空则返回 null），距离相同时随机返回一个
     */
    private findClosestNode(currentNode: any, otherNodeList: any[]): any | null {
        if (otherNodeList.length === 0) return null;
        let minDistSq = Infinity;
        let closestNodes: any[] = [];

        for (const node of otherNodeList) {
            const dx = node.row - currentNode.row;
            const dy = node.col - currentNode.col;
            const distSq = dx * dx + dy * dy;
            
            if (distSq < minDistSq) {
                minDistSq = distSq;
                closestNodes = [node];
            } else if (distSq === minDistSq) {
                closestNodes.push(node);
            }
        }
        // 如果有多个最近节点，随机返回其中一个
        const randomIndex = Math.floor(Math.random() * closestNodes.length);
        return closestNodes[randomIndex];
    }
}


