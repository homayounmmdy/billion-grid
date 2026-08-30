// api/create-pr.js
export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const { x, y, color, githubUsername } = req.body;

    if (!x || !y || !color || !githubUsername) {
        return res.status(400).json({ error: 'Missing required fields' });
    }

    const token = process.env.GITHUB_TOKEN;
    if (!token) {
        console.error('❌ GITHUB_TOKEN is missing in Vercel Environment Variables!');
        return res.status(500).json({ error: 'Server configuration error: Missing GITHUB_TOKEN' });
    }

    const owner = 'homayounmmdy';
    const repo = 'billion-grid';
    // Sanitize username to ensure valid branch name (no spaces or special chars)
    const safeUsername = githubUsername.replace(/[^a-zA-Z0-9_-]/g, '');
    const branchName = `claim/${safeUsername}-${Date.now()}`;
    const filePath = 'public/grid-data.json';
    const timestamp = new Date().toISOString();
    const newSquare = { x, y, userId: githubUsername, color, timestamp };

    try {
        console.log(`🟢 Starting PR creation for @${githubUsername} at (${x}, ${y})`);

        // STEP 1: Get the latest commit SHA from the 'main' branch
        const refRes = await fetch(`https://api.github.com/repos/${owner}/${repo}/git/ref/heads/main`, {
            headers: {
                'Authorization': `token ${token}`,
                'Accept': 'application/vnd.github.v3+json'
            }
        });

        if (!refRes.ok) {
            const errData = await refRes.json();
            console.error('❌ Failed to get main branch ref:', errData);
            return res.status(500).json({ error: 'Failed to get main branch reference' });
        }
        const refData = await refRes.json();
        const latestSha = refData.object.sha;
        console.log('✅ Got latest main branch SHA:', latestSha);

        // STEP 2: Create the new branch pointing to that SHA
        const createBranchRes = await fetch(`https://api.github.com/repos/${owner}/${repo}/git/refs`, {
            method: 'POST',
            headers: {
                'Authorization': `token ${token}`,
                'Accept': 'application/vnd.github.v3+json',
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                ref: `refs/heads/${branchName}`,
                sha: latestSha
            })
        });

        if (!createBranchRes.ok) {
            const errData = await createBranchRes.json();
            console.error('❌ Failed to create branch:', errData);
            return res.status(500).json({ error: `Failed to create branch: ${errData.message}` });
        }
        console.log('✅ Successfully created branch:', branchName);

        // STEP 3: Fetch the current file content from main
        let currentContent = '[]';
        let fileSha = '';

        const fileRes = await fetch(`https://api.github.com/repos/${owner}/${repo}/contents/${filePath}?ref=main`, {
            headers: {
                'Authorization': `token ${token}`,
                'Accept': 'application/vnd.github.v3+json'
            }
        });

        if (fileRes.ok) {
            const fileData = await fileRes.json();
            fileSha = fileData.sha;
            currentContent = Buffer.from(fileData.content, 'base64').toString('utf-8');
            console.log('✅ Successfully fetched existing grid-data.json');
        } else {
            console.log('ℹ️ File does not exist yet or is empty. Starting fresh.');
        }

        // STEP 4: Parse, append, and encode
        let gridData = [];
        try {
            gridData = JSON.parse(currentContent);
        } catch (e) {
            gridData = [];
        }

    // Check if this exact coordinate is already claimed by a DIFFERENT user
    const existingClaim = gridData.find(
      sq => sq.x === x && sq.y === y && sq.userId !== githubUsername
    );

    if (existingClaim) {
      console.error(`❌ Square (${x}, ${y}) is already claimed by @${existingClaim.userId}`);
      return res.status(409).json({
        error: `This square is already claimed by @${existingClaim.userId}. Please choose a different square.`
      });
    }

    console.log('✅ Square is available for claiming');

    // STEP 4: Parse, append, and encode (now we know it's safe)
        gridData.push(newSquare);
        const newContentBase64 = Buffer.from(JSON.stringify(gridData, null, 2)).toString('base64');

        // STEP 5: Create commit on the NEW branch
        const commitPayload = {
            message: `chore: add square claim by @${githubUsername}`,
            content: newContentBase64,
            branch: branchName // Now this branch exists!
        };
        if (fileSha) commitPayload.sha = fileSha;

        const commitRes = await fetch(`https://api.github.com/repos/${owner}/${repo}/contents/${filePath}`, {
            method: 'PUT',
            headers: {
                'Authorization': `token ${token}`,
                'Accept': 'application/vnd.github.v3+json',
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(commitPayload)
        });

        if (!commitRes.ok) {
            const errData = await commitRes.json();
            console.error('❌ GitHub API Commit Error:', JSON.stringify(errData, null, 2));
            return res.status(500).json({ error: `Failed to create commit: ${errData.message || 'Unknown error'}` });
        }
        console.log('✅ Successfully created commit on branch:', branchName);

        // STEP 6: Create Pull Request
        const prTitle = `🎯 Claim: Square (${x.toLocaleString()}, ${y.toLocaleString()}) by @${githubUsername}`;

        const prBody = `## 🎯 New Square Claim

**Claimed By:** @${githubUsername}  
**Coordinates:** (\`${x.toLocaleString()}\`, \`${y.toLocaleString()}\`)  
**Color:** \`${color}\`  
**Timestamp:** \`${timestamp}\`

---
### ⚠️ Action Required for Verification
To prove you are the owner of this GitHub account, **@${githubUsername} must reply to this PR** with the following exact comment:

\`\`\`text
@confirm yes
\`\`\`

*Once confirmed, the automated checks will pass and the repository owner can merge your claim.*  
*(Note: This PR was auto-generated by the Billion Grid App using an automation token, but the claim belongs to you!)*
`;

        const prRes = await fetch(`https://api.github.com/repos/${owner}/${repo}/pulls`, {
            method: 'POST',
            headers: {
                'Authorization': `token ${token}`,
                'Accept': 'application/vnd.github.v3+json',
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                title: prTitle,
                head: branchName,
                base: 'main',
                body: prBody
            })
        });

        if (!prRes.ok) {
            const errData = await prRes.json();
            console.error('❌ GitHub API PR Error:', JSON.stringify(errData, null, 2));
            return res.status(500).json({ error: `Failed to create PR: ${errData.message || 'Unknown error'}` });
        }

        const prData = await prRes.json();
        console.log('✅ Successfully created PR:', prData.html_url);

        return res.status(200).json({
            success: true,
            prUrl: prData.html_url,
            message: 'Pull Request created successfully!'
        });

    } catch (error) {
        console.error('❌ Unhandled Server Error:', error);
        return res.status(500).json({ error: 'Internal server error' });
    }
}
