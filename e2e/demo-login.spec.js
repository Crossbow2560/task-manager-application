const { test, expect } = require('@playwright/test');
const AxeBuilder = require('@axe-core/playwright').default;
const path = require('path');
test.skip(process.env.LOCAL_DEMO_UI !== '1','Requires the explicitly enabled, dedicated local demo server');
for (const [button,name,admin,project] of [
  ['Administrator','Demo Admin',true,true],
  ['Project manager','Demo Manager',false,true],
  ['Team member','Demo Teammate',false,true],
  ['Temporary user','Temporary Demo User',false,false],
  ['Outside project','Outside Project User',false,false],
]) {
  test('One-click login as '+button,async({page})=>{
    await page.goto('/login.html');
    await expect(page.getByText('Try a demo account',{exact:true})).toHaveCount(0);
    await expect(page.locator('#account-picker')).toBeHidden();
    await page.locator('#login-form').getByLabel('Email address',{exact:true}).click();
    const choice=page.getByRole('option',{name:new RegExp('^'+button+' ')});
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

test('Account picker filters, dismisses and supports keyboard selection',async({page})=>{
  await page.goto('/login.html');
  const email=page.locator('#login-form').getByLabel('Email address',{exact:true});
  await email.click();
  await expect(page.getByRole('option')).toHaveCount(5);
  await email.fill('manager');
  await expect(page.getByRole('option')).toHaveCount(1);
  await email.press('Escape');
  await expect(page.locator('#account-picker')).toBeHidden();
  await email.press('ArrowDown');
  await expect(page.getByRole('option')).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(page.getByRole('heading',{level:1})).toHaveText('Good to see you, Demo Manager.');
});
test('Typing an ordinary email preserves manual sign-in',async({page})=>{
  await page.goto('/login.html');
  await page.locator('#login-form').getByLabel('Email address',{exact:true}).fill('someone@example.com');
  await expect(page.locator('#account-picker')).toBeHidden();
  await expect(page.locator('#login-form').getByLabel('Password',{exact:true})).toBeVisible();
  await expect(page).toHaveURL(/login\.html/);
});
