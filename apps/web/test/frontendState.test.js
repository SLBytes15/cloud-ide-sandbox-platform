import test from 'node:test';
import assert from 'node:assert/strict';
import {
  createEditorModelPath,
  createWorkspaceEditorState,
  removeFileTreeItem,
  replaceWorkspaceFiles,
  updateWorkspaceEditorState,
} from '../src/utils/workspaceState.js';
import {
  createTerminalSocketUrl,
  terminalConnectionTransition,
} from '../src/utils/terminalConnection.js';
import {
  getExecutionOutputSections,
  getExecutionStatusLabel,
} from '../src/utils/executionState.js';

test('workspace buffers and tabs remain isolated for identical paths', () => {
  let states = new Map([
    ['one', createWorkspaceEditorState([], [{ path: '/src/index.js', content: 'one' }], [
      { id: 'one-tab', name: 'index.js', path: '/src/index.js' },
    ], '/src/index.js')],
    ['two', createWorkspaceEditorState([], [{ path: '/src/index.js', content: 'two' }], [
      { id: 'two-tab', name: 'index.js', path: '/src/index.js' },
    ], '/src/index.js')],
  ]);

  states = updateWorkspaceEditorState(states, 'one', (state) => ({
    ...state,
    fileBuffers: new Map(state.fileBuffers).set('/src/index.js', 'edited one'),
  }));

  assert.equal(states.get('one').fileBuffers.get('/src/index.js'), 'edited one');
  assert.equal(states.get('two').fileBuffers.get('/src/index.js'), 'two');
  assert.equal(states.get('two').openTabs[0].id, 'two-tab');
});

test('Monaco model paths are unique across workspaces for the same file path', () => {
  assert.notEqual(
    createEditorModelPath('workspace one', '/src/index.js'),
    createEditorModelPath('workspace-two', '/src/index.js'),
  );
  assert.equal(createEditorModelPath('workspace one', '/src/index.js'), '/workspace%20one/src/index.js');
});

test('loading server files keeps a dirty buffer and drops stale clean tabs', () => {
  const current = createWorkspaceEditorState([], [
    { path: '/dirty.js', content: 'local edit' },
    { path: '/clean.js', content: 'old content' },
  ], [
    { id: 'dirty', name: 'dirty.js', path: '/dirty.js', isDirty: true },
    { id: 'clean', name: 'clean.js', path: '/clean.js' },
  ], '/clean.js');

  const next = replaceWorkspaceFiles(current, [], [
    { path: '/dirty.js', content: 'server version' },
    { path: '/fresh.js', content: 'fresh' },
  ]);

  assert.equal(next.fileBuffers.get('/dirty.js'), 'local edit');
  assert.equal(next.fileBuffers.get('/fresh.js'), 'fresh');
  assert.deepEqual(next.openTabs.map((tab) => tab.path), ['/dirty.js']);
  assert.equal(next.activeTabPath, '/dirty.js');
});

test('nested file removal updates the matching tree node only', () => {
  const tree = [{
    id: 'src', name: 'src', path: '/src', type: 'directory', children: [
      { id: 'a', name: 'a.js', path: '/src/a.js', type: 'file' },
      { id: 'b', name: 'b.js', path: '/src/b.js', type: 'file' },
    ],
  }];

  const next = removeFileTreeItem(tree, '/src/a.js');
  assert.deepEqual(next[0].children.map((item) => item.path), ['/src/b.js']);
  assert.equal(tree[0].children.length, 2);
});

test('terminal socket URL uses ws/wss and safely encodes workspace id', () => {
  assert.equal(
    createTerminalSocketUrl({ protocol: 'http:', host: 'localhost:5173' }, 'workspace one'),
    'ws://localhost:5173/ws/terminal?workspaceId=workspace+one',
  );
  assert.equal(
    createTerminalSocketUrl({ protocol: 'https:', host: 'ide.example.test' }, 'ws-2'),
    'wss://ide.example.test/ws/terminal?workspaceId=ws-2',
  );
});

test('terminal lifecycle does not report a closed or failed socket as connected', () => {
  let status = terminalConnectionTransition('disconnected', 'connect');
  assert.equal(status, 'connecting');
  status = terminalConnectionTransition(status, 'open');
  assert.equal(status, 'connected');
  status = terminalConnectionTransition(status, 'reconnect');
  assert.equal(status, 'reconnecting');
  status = terminalConnectionTransition(status, 'error');
  assert.equal(status, 'error');
  assert.equal(terminalConnectionTransition(status, 'close'), 'error');
  assert.equal(terminalConnectionTransition('connected', 'disconnect'), 'disconnected');
  assert.equal(terminalConnectionTransition('connected', 'dispose'), 'closed');
});

test('execution panel labels only states supported by the shared job model', () => {
  assert.equal(getExecutionStatusLabel('idle'), 'Idle');
  assert.equal(getExecutionStatusLabel('pending'), 'Pending');
  assert.equal(getExecutionStatusLabel('running'), 'Running');
  assert.equal(getExecutionStatusLabel('completed'), 'Completed');
  assert.equal(getExecutionStatusLabel('failed'), 'Failed');
  assert.equal(getExecutionStatusLabel('timeout'), 'Timed out');
  assert.equal(getExecutionStatusLabel('request-error'), 'Unavailable');
});

test('execution output avoids rendering identical error text twice', () => {
  assert.deepEqual(
    getExecutionOutputSections({ status: 'failed', output: 'SyntaxError', error: 'SyntaxError', exitCode: 1, durationMs: 2 }),
    { output: 'SyntaxError', error: '' },
  );
  assert.deepEqual(
    getExecutionOutputSections({ status: 'failed', output: 'before error', error: 'ReferenceError', exitCode: 1, durationMs: 2 }),
    { output: 'before error', error: 'ReferenceError' },
  );
});
