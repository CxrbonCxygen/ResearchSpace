import type {Card} from './model.ts';

// Exact-field updates preserve personal edits and review metadata.
const corrections: {id:string,field:'intuition'|'formula'|'code'|'application',before:string,after:string}[]=[
  {
    "id": "kl",
    "field": "intuition",
    "before": "用分布 Q 近似分布 P 时，KL 散度衡量这种近似造成的信息损失。它通常不对称。",
    "after": "对离散概率分布，KL 散度衡量用 Q 近似 P 的差异；它非负，但通常不对称，也不是满足三角不等式的距离。P(x)>0 而 Q(x)=0 时为正无穷；P(x)=0 的项按极限记为 0。"
  },
  {
    "id": "kl",
    "field": "code",
    "before": "import torch\np = torch.tensor([0.8, 0.2])\nq = torch.tensor([0.5, 0.5])\nkl = (p * (p.log() - q.log())).sum()",
    "after": "import torch\np = torch.tensor([0.8, 0.2])\nq = torch.tensor([0.5, 0.5])\n# 假定 p/q 非负且各自和为 1；忽略 p=0 的项\nkeep = p > 0\nkl = (p[keep] * (p[keep].log() - q[keep].log())).sum()"
  },
  {
    "id": "ce",
    "field": "intuition",
    "before": "用预测分布 Q 为真实分布 P 中的事件编码时，平均需要多少信息。分类任务中，它会惩罚给真实类别较低概率的预测。",
    "after": "交叉熵是从真实分布 P 采样时，预测分布 Q 的负对数概率的期望。离散分类且 P 为 one-hot 时，就是正确类别的负对数概率；信息单位取决于对数底。"
  },
  {
    "id": "ce",
    "field": "application",
    "before": "H(P,Q) = H(P) + D_KL(P‖Q)。常用于分类与语言模型。",
    "after": "\\(H(P,Q)=H(P)+D_{\\mathrm{KL}}(P\\parallel Q)\\)。这一离散分布关系需使用相同对数底与支持集约定；P 固定时最小化交叉熵等价于最小化前向 KL。PyTorch 输入通常为原始 logits。"
  },
  {
    "id": "gradient",
    "field": "intuition",
    "before": "梯度汇总函数对各变量的偏导数，指向局部增长最快的方向。梯度下降沿负梯度更新。",
    "after": "梯度汇总可微函数对各变量的偏导数。在欧氏距离下且梯度非零时，单位梯度方向具有最大方向导数；梯度下降沿负梯度更新，但步长过大不保证损失下降。"
  },
  {
    "id": "onpolicy",
    "field": "intuition",
    "before": "在当前学生自身生成的状态或样本上获取教师信号，让学习分布贴近实际推理时会遇到的分布。",
    "after": "On-policy 蒸馏强调在当前学生生成的样本或状态上取得教师信号；自蒸馏强调教师信号来自自身模型、快照或自身推理过程。两者是不同维度，on-policy 不自动意味着自蒸馏。"
  },
  {
    "id": "onpolicy",
    "field": "application",
    "before": "用于减少训练与推理状态分布的偏差。",
    "after": "用于减轻训练与推理状态分布不一致。这里是通用流程示意，不是 d-OPSD 的完整目标：教师来自哪个状态、是否固定、监督哪些位置和 KL 方向，都必须核对具体论文及生效代码。"
  },
  {
    "id": "foundation-v1-conv1d",
    "field": "intuition",
    "before": "一维卷积用共享的局部滤波器沿序列滑动。输入通道描述同一位置的特征，卷积核长度决定一次看到多少邻近位置。",
    "after": "一维卷积层用共享局部滤波器沿序列滑动。PyTorch Conv1d 实际计算互相关，不先翻转卷积核；有效感受野还受 dilation 影响，不能只看 kernel_size。"
  },
  {
    "id": "foundation-v1-batch",
    "field": "formula",
    "before": "B_{\\mathrm{effective}}=B_{\\mathrm{micro}}\\times K\\times N_{\\mathrm{devices}}",
    "after": "B_{\\mathrm{effective}}=B_{\\mathrm{micro}}\\times K\\times N_{\\mathrm{replicas}}"
  },
  {
    "id": "foundation-v1-batch",
    "field": "application",
    "before": "比较实验时记录微批量、设备数、累积步数、drop_last 和实际优化步数。BatchNorm 的统计仍可能受微批量影响。",
    "after": "上式 N 指数据并行副本数，不是任意 GPU 总数；纯张量并行的多卡并不自动扩大批量。等大微批和正确损失缩放是该解释的前提。变长序列还需核对有效 token 权重。"
  }
];
export function correctKnowledge(cards:Card[]){
 for(const c of cards)for(const p of corrections){if(c.id===p.id&&c[p.field]===p.before)c[p.field]=p.after;}
}
