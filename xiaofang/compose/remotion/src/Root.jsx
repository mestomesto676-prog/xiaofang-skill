import { Composition, Still } from 'remotion';
import { XfPackage, xfPackageDefaults } from './XfPackage.jsx';
import { XfCover, xfCoverDefaults } from './XfCover.jsx';
const FPS = 30;
export const Root = () => (
  <>
    {/* 包装：片头（可 0）＋ 正片（huashu 引擎渲的无声画面层）＋ 片尾（可 0），正片上叠栏目角标。时长由 props 算 */}
    <Composition id="XfPackage" component={XfPackage} width={1080} height={1920} fps={FPS} durationInFrames={FPS * 15}
      defaultProps={xfPackageDefaults}
      calculateMetadata={({ props }) => ({ durationInFrames: Math.round((props.introSec + props.bodySec + props.outroSec) * FPS) })} />
    {/* 封面 3:4（抖音/小红书/视频号通用的竖封面），也可改 9:16 */}
    <Still id="XfCover" component={XfCover} width={1080} height={1440} defaultProps={xfCoverDefaults} />
  </>
);
