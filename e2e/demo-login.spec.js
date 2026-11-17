const { test, expect } = require('@playwright/test');
const AxeBuilder = require('@axe-core/playwright').default;
const path = require('path');
test.skip(process.env.LOCAL_DEMO_UI !== '1','Requires the explicitly enabled, dedicated local demo server');
for (const [button,name,admin,project] of [
  ['Demo Admin','Demo Admin',true,true],
  ['Demo Manager','Demo Manager',false,true],
  ['Demo Teammate','Demo Teammate',false,true],
  ['Temporary Demo User','Temporary Demo User',false,false],
  ['Outside Project User','Outside Project User',false,false],
]) {
  test('One-click login as '+button,async({page})=>{
    await page.goto('/login.html');
    const choice=page.getByRole('button',{name:new RegExp('^'+button+' ')});
    await expect(choice).toBeVisible();
    if(admin){
      const audit=await new AxeBuilder({page}).withTags(['wcag2a','wcag2aa','wcag21a','wcag21aa']).analyze();
      expect(audit.violations.filter(v=>v.impact==='critical'||v.impact==='serious')).toEqual([]);
      await page.screenshot({path:path.join(__dirname,'../docs/validation/evidence/demo-login-preview.png'),fullPage:true});
    }
    await choice.click();
    await expect(page).toHaveURL(/dashboard\.html/);
    await expect(page.getByRole('heading',{level:1})).toHaveText('Good to see you, '+name+'.');
    await expect(page.getByRole('link',{name:'Administration',exact:true})).toHaveCount(admin?1:0);
    await expect(page.locator('.project-link')).toHaveCount(project?1:0);
  });
}
