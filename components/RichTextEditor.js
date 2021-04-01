import React from 'react';
import PropTypes from 'prop-types';
import css from '@styled-system/css';
import styled from 'styled-components';
import { v4 as uuid } from 'uuid';
import { isURL } from 'validator';

import { uploadImageWithXHR } from '../lib/api';
import { stripHTML } from '../lib/utils';

import Container from './Container';
import HTMLContent from './HTMLContent';
import LoadingPlaceholder from './LoadingPlaceholder';
import MessageBox from './MessageBox';
import StyledTag from './StyledTag';

const TrixEditorContainer = styled.div`
  ${props =>
    props.withBorders &&
    css({
      border: '1px solid',
      borderColor: !props.error ? 'black.300' : 'red.300',
      borderRadius: 10,
      padding: 3,
    })}

  trix-editor {
    border: none;
    padding: 0;
    margin-top: 8px;
    padding-top: 8px;
    outline-offset: 0.5em;
    overflow-y: auto;

    // Outline (only when there's no border)
    ${props =>
      !props.withBorders &&
      css({
        outline: !props.error ? 'none' : `1px dashed ${props.theme.colors.red[300]}`,
        '&:focus': {
          outline: `1px dashed ${props.theme.colors.black[200]}`,
        },
      })}

    // Placeholder
    &:empty:not(:focus)::before {
      color: ${props => props.theme.colors.black[400]};
    }

    // Image captions are disabled
    figcaption {
      display: none;
    }

    ${props =>
      css({
        minHeight: props.editorMinHeight,
        maxHeight: props.editorMaxHeight,
      })}
  }

  trix-toolbar {
    min-height: 40px;
    background: ${props => props.toolbarBackgroundColor};
    ${props => !props.withBorders && `box-shadow: 0px 5px 3px -3px rgba(0, 0, 0, 0.1);`}
    z-index: 2;
    margin-bottom: 8px;
    ${props => props.withBorders && `min-height: 0px; margin-bottom: 0;`}

    .trix-button-group {
      border-radius: 6px;
      border-color: #c4c7cc;
      margin-bottom: 0;
      background: white;
    }

    .trix-button {
      border-bottom: none;
      display: inline-block;
      height: auto;

      &:hover {
        background: ${props => props.theme.colors.blue[100]};
      }

      &.trix-active {
        background: ${props => props.theme.colors.blue[200]};
      }

      &::before,
      &.trix-active::before {
        margin: 4px; // Use this to reduce the icons size
      }
    }

    /** Hide some buttons on the simplified version */
    ${props =>
      props.version === 'simplified' &&
      css({
        '.trix-button-group--file-tools': {
          display: 'none',
        },
        '.trix-button-group--block-tools .trix-button:not(.trix-button--icon-number-list):not(.trix-button--icon-bullet-list)': {
          display: 'none',
        },
        '.trix-button--icon-bullet-list': {
          borderLeft: 'none',
        },
      })}

    /** Hide some buttons on mobile */
    @media (max-width: 500px) {
      .trix-button--icon-strike,
      .trix-button--icon-number-list,
      .trix-button--icon-decrease-nesting-level,
      .trix-button--icon-increase-nesting-level {
        display: none;
      }
    }

    /** Sticky mode */
    ${props =>
      props.withStickyToolbar &&
      css({
        position: 'sticky',
        top: props.toolbarTop || 0,
        marginTop: props.toolbarOffsetY,
        p: '10px',
      })}

    /** Custom icons */
    .trix-button--icon-attach::before {
      // See https://feathericons.com/?query=image
      background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='24' height='24' viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Crect x='3' y='3' width='18' height='18' rx='2' ry='2'/%3E%3Ccircle cx='8.5' cy='8.5' r='1.5'/%3E%3Cpolyline points='21 15 16 10 5 21'/%3E%3C/svg%3E");
    }
    .trix-button--video-attach::before {
      top: 8%;
      bottom: 4%;
      // See https://feathericons.com/?query=video
      background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='24' height='24' viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='2' stroke-linecap='round' stroke-linejoin='round' class='feather feather-video'%3E%3Cpolygon points='23 7 16 12 23 17 23 7'%3E%3C/polygon%3E%3Crect x='1' y='5' width='15' height='14' rx='2' ry='2'%3E%3C/rect%3E%3C/svg%3E");
    }
  } // End of toolbar customization

  /** Disabled mode */
  ${props =>
    props.isDisabled &&
    css({
      pointerEvents: 'none',
      cursor: 'not-allowed',
      background: '#f3f3f3',
      'trix-toolbar': {
        background: '#f3f3f3',
      },
    })}
`;

/**
 * A React wrapper around the Trix library to edit rich text.
 * Produces HTML and clear text.
 */
export default class RichTextEditor extends React.Component {
  static propTypes = {
    /** If not provided, an id will be automatically generated which will require a component update */
    id: PropTypes.string,
    defaultValue: PropTypes.string,
    value: PropTypes.string,
    placeholder: PropTypes.string,
    toolbarBackgroundColor: PropTypes.string.isRequired,
    /** Font size for the text */
    fontSize: PropTypes.string,
    autoFocus: PropTypes.bool,
    /** Called when text is changed with html content as first param and text content as second param */
    onChange: PropTypes.func,
    /** A name for the input */
    inputName: PropTypes.string,
    /** Change this prop to reset the value */
    reset: PropTypes.any,
    /** If true, max text length will be displayed at the bottom right */
    showCount: PropTypes.bool,
    /** max length which is allowed */
    maxLength: PropTypes.number,
    /** Wether the toolbar should stick to the top */
    withStickyToolbar: PropTypes.bool,
    /** This component is borderless by default. Set this to `true` to change that. */
    withBorders: PropTypes.bool,
    /** This component is borderless by default. Set this to `true` to change that. */
    version: PropTypes.oneOf(['default', 'simplified']),
    /** Wether the field should be disabled */
    disabled: PropTypes.bool,
    /** If position is sticky, this prop defines the `top` property. Support responsive arrays */
    toolbarTop: PropTypes.oneOfType([PropTypes.number, PropTypes.string, PropTypes.array]),
    /** Useful to compensate the height of the toolbar when editing inline */
    toolbarOffsetY: PropTypes.oneOfType([PropTypes.number, PropTypes.string, PropTypes.array]),
    /** Min height for the full component */
    editorMinHeight: PropTypes.oneOfType([PropTypes.number, PropTypes.string, PropTypes.array]),
    editorMaxHeight: PropTypes.oneOfType([PropTypes.number, PropTypes.string, PropTypes.array]),
    /** If truthy, will display a red outline */
    error: PropTypes.any,
    'data-cy': PropTypes.string,
  };

  static defaultProps = {
    withStickyToolbar: false,
    toolbarTop: 0,
    toolbarOffsetY: -62, // Default Trix toolbar height
    inputName: 'content',
    toolbarBackgroundColor: 'white',
    version: 'default',
    'data-cy': 'RichTextEditor',
  };

  constructor(props) {
    super(props);
    this.editorRef = React.createRef();
    this.mainContainerRef = React.createRef();
    this.state = { id: props.id, error: null };
    this.isReady = false;

    if (typeof window !== 'undefined') {
      this.Trix = require('trix');
      this.Trix.config.blockAttributes.heading1 = { tagName: 'h3' };
      this.Trix.config.attachments.preview.caption = { name: false, size: false };
    }
  }

  componentDidMount() {
    if (!this.state.id) {
      this.setState({ id: uuid() });
    } else if (!this.isReady) {
      this.initialize();
    }
  }

  componentDidUpdate(oldProps) {
    if (!this.isReady) {
      this.initialize();
    } else if (oldProps.reset !== this.props.reset) {
      this.editorRef.current.editor.loadHTML('');
    }
  }

  componentWillUnmount() {
    if (this.isReady) {
      this.editorRef.current.removeEventListener('trix-change', this.handleChange);
      this.editorRef.current.removeEventListener('trix-attachment-add', this.handleUpload);
      this.editorRef.current.removeEventListener('trix-attachment-add', this.handleFileAccept);
      this.editorRef.current.removeEventListener('trix-action-invoke', this.trixActionInvoke);
    }
  }

  getEditor() {
    return this.editorRef.current.editor;
  }

  initialize = () => {
    if (this.Trix && this.editorRef.current) {
      // Listen for changes
      this.editorRef.current.addEventListener('trix-change', this.handleChange, false);
      this.editorRef.current.addEventListener('trix-attachment-add', this.handleUpload);
      this.editorRef.current.addEventListener('trix-file-accept', this.handleFileAccept);
      this.editorRef.current.addEventListener('trix-action-invoke', this.trixActionInvoke);
      this.editorRef.current.addEventListener('trix-initialize', event => {
        this.replaceEmbeddedIFrames(this.props.value || this.props.defaultValue);
        this.trixVideoEmbed(event);
        // Some special handling for links
        if (this.mainContainerRef.current) {
          // We must listen when the user presses the 'Enter' key and when the user clicks the 'Link' button as well
          const linkInput = this.mainContainerRef.current.querySelector("[data-trix-input][name='href']");
          linkInput?.addEventListener('keydown', e => {
            if (e.key === 'Enter') {
              this.handleLink();
            }
          });

          const addLinkBtn = this.mainContainerRef.current.querySelector("[data-trix-method='setAttribute']");
          addLinkBtn?.addEventListener('click', this.handleLink);
        }
      });

      // Component ready!
      this.isReady = true;
    }
  };

  /** ---- Trix handlers ---- */
  replaceEmbeddedIFrames = value => {
    const iframeRegex = new RegExp(`<iframe.+?iframe>`, 'ig');
    let match;
    let lastIndex = 0;

    while ((match = iframeRegex.exec(value))) {
      if (lastIndex === 0) {
        this.getEditor().loadHTML('');
      }
      const iframe = match[0];
      const position = match.index;
      const preText = value.substring(lastIndex, position);
      this.getEditor().setSelectedRange([lastIndex, position]);
      this.getEditor().insertHTML(preText);
      const attachment = new this.Trix.Attachment({ content: iframe });
      this.getEditor().insertAttachment(attachment);
      lastIndex = match.index + iframe.length;
    }
  };

  trixVideoEmbed = e => {
    const videoEmbedButton = `<button type="button" tabindex="-1" data-trix-action="x-video-dialog-open" title="Attach Video" class="trix-button trix-button--icon trix-button--video-attach">Attach Video</button>`;
    const videoEmbedDialog = `
            <div class="trix-dialog" data-trix-dialog="video-url" data-trix-dialog-attribute="video">
              <div class="trix-dialog__link-fields">
                <input type="url" name="video-url" class="trix-input trix-input--dialog trix-input--dialog-video" placeholder="Enter Video URL…" aria-label="Video URL" data-trix-input="">
                <div class="trix-button-group">
                  <input type="button" class="trix-button trix-button--dialog" value="Add Video" data-trix-action="x-video-embed">
                </div>
              </div>
              <strong>Note: Only YouTube and Vimeo links are supported.</strong>
            </div>`;
    const { toolbarElement } = e.target;
    const attachFilesButton = toolbarElement.querySelector('[data-trix-action=attachFiles]');
    attachFilesButton.insertAdjacentHTML('afterend', videoEmbedButton);
    const trixDialog = toolbarElement.querySelector('.trix-dialog--link');
    trixDialog.insertAdjacentHTML('afterend', videoEmbedDialog);
  };

  trixActionInvoke = e => {
    const { toolbarElement } = e.target;
    if (e.actionName === 'x-video-dialog-open') {
      const attachVideoDialog = toolbarElement.querySelector('[data-trix-dialog=video-url]');
      const attachVideoDialogInput = toolbarElement.querySelector('.trix-input--dialog-video');
      if (attachVideoDialog.getAttribute('data-trix-active') === '') {
        attachVideoDialog.removeAttribute('data-trix-active');
      } else {
        attachVideoDialog.setAttribute('data-trix-active', '');
        attachVideoDialogInput.removeAttribute('disabled');
      }
    } else if (e.actionName === 'x-video-embed') {
      const videoLink = toolbarElement.querySelector('.trix-input--dialog-video').value;
      if (videoLink) {
        this.embedVideoIFrame(videoLink);
      }
    }
  };

  constructVideoEmbedURL = videoLink => {
    const { id, service } = this.parseVideoLink(videoLink);
    if (service === 'youtube') {
      return `https://www.youtube.com/embed/${id}`;
    } else if (service === 'vimeo') {
      return `https://player.vimeo.com/video/${id}`;
    } else {
      return null;
    }
  };

  parseVideoLink = videoLink => {
    const regexps = {
      youtube: new RegExp(
        '(?:https?://)?(?:www.)?youtu(?:.be/|be.com/\\S*(?:watch|embed)(?:(?:(?=/[^&\\s?]+(?!\\S))/)|(?:\\S*v=|v/)))([^&\\s?]+)',
        'ig',
      ),
      vimeo: new RegExp(
        '(http|https)?://(www.)?vimeo.com/(?:channels/(?:\\w+/)?|groups/([^/]*)/videos/|)(\\d+)(?:|/?)',
      ),
    };
    for (const service in regexps) {
      const matches = regexps[service].exec(videoLink);
      if (matches) {
        return { service, id: matches[matches.length - 1] };
      }
    }
    return {};
  };

  embedVideoIFrame = videoLink => {
    const embedLink = this.constructVideoEmbedURL(videoLink);
    if (embedLink) {
      const embed = `<iframe src="${embedLink}/?showinfo=0" frameborder="0" allowfullscreen/>`;
      const attachment = new this.Trix.Attachment({ content: embed });
      this.getEditor().insertAttachment(attachment);
    }
  };

  handleChange = e => {
    // Trigger content formatters
    this.autolink();

    // Notify parent function
    if (this.props.onChange) {
      this.props.onChange(e);
    }

    // Reset errors
    if (this.state.error) {
      this.setState({ error: null });
    }
  };

  handleFileAccept = e => {
    if (!/^image\//.test(e.file.type)) {
      alert('You can only upload images.');
      e.preventDefault();
    } else if (e.file.size > 4000000) {
      // Prevent attaching files > 4MB
      alert('This file is too big (max: 4mb).');
      e.preventDefault();
    }
  };

  handleUpload = e => {
    const { attachment } = e;
    if (!attachment.file) {
      return;
    }

    const onProgress = progress => attachment.setUploadProgress(progress);
    const onSuccess = fileURL => attachment.setAttributes({ url: fileURL, href: fileURL });
    const onFailure = () => this.setState({ error: 'File upload failed' });
    uploadImageWithXHR(attachment.file, { onProgress, onSuccess, onFailure });
    return e;
  };

  handleLink = () => {
    const urlInput = this.mainContainerRef.current?.querySelector("[data-trix-input][name='href']");
    const urlInputValue = urlInput?.value?.trim();

    // Ignore missing input or empty values
    if (!urlInputValue) {
      return;
    }

    // Automatically add 'https://' to the url
    // eslint-disable-next-line camelcase
    if (isURL(urlInputValue, { require_protocol: false }) && !isURL(urlInputValue, { require_protocol: true })) {
      urlInput.value = `https://${urlInputValue}`;
    }
  };

  /** Automatically create anchors with hrefs for links */
  autolink() {
    const linkRegex = new RegExp(`(https?://\\S+\\.\\S+)\\s`, 'ig');
    const editor = this.getEditor();
    const content = editor.getDocument().toString();
    let match;
    while ((match = linkRegex.exec(content))) {
      const url = match[1];
      if (isURL(url)) {
        const position = match.index;
        const urlLength = this.autolinkDelimiter(url);
        const range = [position, position + urlLength];
        const hrefAtRange = editor.getDocument().getCommonAttributesAtRange(range).href;
        const newURL = url.slice(0, urlLength);
        if (hrefAtRange !== newURL) {
          this.updateInRange(editor, range, 0, () => {
            if (editor.canActivateAttribute('href')) {
              editor.activateAttribute('href', newURL);
            }
          });
        }
      }
    }
  }

  /** A helper used by autolink to find where the url actually ends
   * Credits:
   * https://github.com/github/cmark-gfm/blob/36c1553d2a1f04dc1628e76b18490edeff78b8d0/extensions/autolink.c#L37
   * https://github.com/vmg/redcarpet/blob/92a7b3ae2241b862e9bf45e0af3cf53ebdfb0afb/ext/redcarpet/autolink.c#L58
   */
  autolinkDelimiter = url => {
    let lastCharacterPosition = url.length;

    while (lastCharacterPosition > 0) {
      const lastCharacterIndex = lastCharacterPosition - 1;
      const closingPair = url[lastCharacterIndex];

      let openingPair;
      if (closingPair === ')') {
        openingPair = '(';
      } else if (closingPair === ']') {
        openingPair = '[';
      } else if (closingPair === '}') {
        openingPair = '{';
      } else if (closingPair === '"') {
        openingPair = '"';
      } else if (closingPair === "'") {
        openingPair = "'";
      }

      // Ensure single punctuations marks at the end of the URL are not included as part of link
      if ('?!.,:;*_~'.includes(url[lastCharacterIndex])) {
        lastCharacterPosition--;
      } else if (openingPair) {
        let opening = 0,
          closing = 0;

        /** Check to ensure that when a URL is enclosed within pair punctuations,
         * we do not include the closing punctuation as part of the link.
         * We only want to accept a closing punctuation at the end of the link,
         * if there is a corresponding opening punctuation within the URL.
         */

        for (let i = 0; i < lastCharacterPosition; i++) {
          if (url[i] === openingPair) {
            opening++;
          } else if (url[i] === closingPair) {
            closing++;
          }
        }

        if (opening >= closing) {
          break;
        }

        lastCharacterPosition--;
      } else {
        break;
      }
    }

    return lastCharacterPosition;
  };

  /** A trix helper that will apply func in range then restore base range when it's done */
  updateInRange(editor, range, offset = 0, updateFunc) {
    const baseRange = editor.getSelectedRange();
    editor.setSelectedRange(range);
    updateFunc();
    editor.setSelectedRange([baseRange[0] + offset, baseRange[1] + offset]);
  }

  /** ---- Render ---- */

  render() {
    const {
      defaultValue,
      withStickyToolbar,
      toolbarTop,
      toolbarOffsetY,
      toolbarBackgroundColor,
      autoFocus,
      placeholder,
      editorMinHeight,
      withBorders,
      inputName,
      disabled,
      error,
      fontSize,
      value,
      version,
      showCount,
      maxLength,
      editorMaxHeight,
    } = this.props;

    return !this.state.id ? (
      <LoadingPlaceholder
        maxHeight={editorMaxHeight ? editorMaxHeight + 56 : undefined}
        height={editorMinHeight ? editorMinHeight + 56 : 200}
      />
    ) : (
      <TrixEditorContainer
        withStickyToolbar={withStickyToolbar}
        toolbarTop={toolbarTop}
        toolbarOffsetY={toolbarOffsetY}
        toolbarBackgroundColor={toolbarBackgroundColor}
        editorMinHeight={editorMinHeight}
        editorMaxHeight={editorMaxHeight}
        withBorders={withBorders}
        version={version}
        isDisabled={disabled}
        error={error}
        data-cy={this.props['data-cy']}
        ref={this.mainContainerRef}
      >
        {this.state.error && (
          <MessageBox type="error" withIcon>
            {this.state.error.toString()}
          </MessageBox>
        )}
        <input id={this.state.id} value={value || defaultValue} type="hidden" name={inputName} />
        <HTMLContent fontSize={fontSize}>
          {!showCount ? (
            <trix-editor
              ref={this.editorRef}
              input={this.state.id}
              autofocus={autoFocus ? true : undefined}
              placeholder={placeholder}
            />
          ) : (
            <Container position="relative">
              <trix-editor
                ref={this.editorRef}
                input={this.state.id}
                autofocus={autoFocus ? true : undefined}
                placeholder={placeholder}
              />
              <Container position="absolute" bottom="1em" right="1em">
                <StyledTag textTransform="uppercase">
                  <span>{stripHTML(defaultValue).length}</span>
                  {maxLength && <span> / {maxLength}</span>}
                </StyledTag>
              </Container>
            </Container>
          )}
        </HTMLContent>
      </TrixEditorContainer>
    );
  }
}
