<template>

  <div class="preview-display-wrapper" v-bind:class="{ loading: isLoading }" >

    <transition name="navigation">
      <div class="preview-container" >
        <div class="preview-loader"  v-bind:class="{ show: (isLoading || pageImgLoading) && !noPreviewAvailable }"  v-html="componentLoader"></div>
        <div class="doc-name" v-if="documentData">
          {{documentData.originalname}}
        </div>
        <div class="page-wrapper" >
          <transition name="nopreviewpage">
            <div class="no-preview-page"  v-show="noPreviewAvailable" v-html="noPreviewPage"></div>
          </transition>
          <transition name="nopreviewpage">
            <div class="no-preview-page"  v-show="previewInProgress" v-html="previewInProgressPage"></div>
          </transition>
          <img id="pageImg" v-bind:src="previewImage" @load="pageImgLoaded" v-bind:class="{ 'page-change': pageImgLoading || isLoading }" v-show="!noPreviewAvailable && !previewInProgress">
        </div>
        <div class="page-status-wrapper" >
          <span>
            {{previewNav.currentPage + 1}} / {{previewNav.pageCount}}
          </span>
        </div>
      </div>
    </transition>

    <div class="btns-wrapper btns-top">
      <div class="document-download-btn doc-btn" v-on:click="documentDownload()">
        <svg id="Layer_1" viewBox="0 0 204 185"><g id="Group_127" data-name="Group 127"><g id="download"><g id="Group_123" data-name="Group 123"><g id="Group_122" data-name="Group 122"><path id="Path_163" data-name="Path 163" class="cls-1" d="M143.9,85.13A5.26,5.26,0,0,0,139.11,82H118.05V13.58a5.27,5.27,0,0,0-5.28-5.26H91.68a5.26,5.26,0,0,0-5.26,5.26V82H65.36a5.26,5.26,0,0,0-4,8.77l36.86,42.13a5.24,5.24,0,0,0,7.41.5,3.94,3.94,0,0,0,.5-.5L143,90.81A5.25,5.25,0,0,0,143.9,85.13Z"/></g></g><g id="Group_125" data-name="Group 125"><g id="Group_124" data-name="Group 124"><path id="Path_164" data-name="Path 164" class="cls-1" d="M160.17,124.17v31.6H44.32v-31.6H23.25V166.3a10.53,10.53,0,0,0,10.53,10.53H170.7a10.52,10.52,0,0,0,10.53-10.52h0V124.17Z"/></g></g></g></g></svg>
      </div>
      <div class="doc-btn close" v-on:click="previewClose()"  >
        <svg id="Layer_1"  viewBox="0 0 204 185"><g id="Group_127" data-name="Group 127"><g id="cancel-music"><path id="Path_162" data-name="Path 162" class="cls-1" d="M121.76,92.57l60.09-60.09a14.17,14.17,0,0,0-20.06-20l-60,60.09L41.65,12.46a14.16,14.16,0,0,0-20,20L81.71,92.57,21.63,152.63a14.16,14.16,0,0,0,20,20l60.09-60.08,60.05,60.11a14.18,14.18,0,0,0,20.06-20.05h0Z"/></g></g></svg>
      </div>
    </div>

    <div class="prev-page-btn"  v-show="!noPreviewAvailable">
      <transition name="navigation">
        <div class="doc-btn" v-on:click="changePage(-1)"  v-if="previewNav.currentPage !== 0">
          <svg id="Layer_1" viewBox="0 0 120 185"><path id="Path_161" data-name="Path 161" class="cls-1" d="M16.07,84.15,88.75,11.46A11.84,11.84,0,0,1,105.49,28.2L41.18,92.51l64.31,64.31a11.84,11.84,0,0,1-16.74,16.74L16.07,100.88A11.83,11.83,0,0,1,16.07,84.15Z"/></svg>
        </div>
      </transition>
    </div>

    <div class=" next-page-btn"  v-show="!noPreviewAvailable">
      <transition name="navigation">
        <div class="doc-btn" v-on:click="changePage(1)"  v-if="previewNav.currentPage < previewNav.pageCount - 1">
          <svg id="Layer_1" viewBox="0 0 120 185"><path id="Path_161" data-name="Path 161" class="cls-1" d="M105.46,100.88,32.78,173.56A11.84,11.84,0,0,1,16,156.82L80.36,92.51,16,28.2A11.84,11.84,0,0,1,32.78,11.46l72.68,72.68A11.84,11.84,0,0,1,105.46,100.88Z"/></svg>
        </div>
      </transition>
    </div>

  </div>

</template>

<script type="text/babel">

  import noPreviewPageHTML from './noPreviewPage.html';
  import previewInProgressHTML from './previewInProgress.html';
  import componentLoaderHTML from '../loaders/componentLoader.html';

  export default {
    props: ['previewActive', 'documentData'],
    data() {
      return{
        previewInProgress: false,
        componentLoader: componentLoaderHTML,
        noPreviewPage: noPreviewPageHTML,
        previewInProgressPage: previewInProgressHTML,
        noPreviewAvailable: false,
        isLoading: true,
        pageImgLoading: true,
        previewThumbnails: null,
        previewImage: null,
        previewNav: {currentPage: null, pageCount: null}
      }
    },
    created: function () {

    },
    methods: {
      keyEventEnable(enable){
        if(enable){
          window.addEventListener('keyup', this.keyEventAction );
        }else{
          window.removeEventListener('keyup' , this.keyEventAction , true);
        }
      },
      keyEventAction(e){
        if(e.key === "Escape"){
          this.previewClose();
        }else if(e.key === "ArrowLeft"){
          this.changePage(-1);
        }else if(e.key === "ArrowRight"){
          this.changePage(1);
        }
      },
      pageImgLoaded(){
        setTimeout(()=>{
          this.isLoading = false;
          this.pageImgLoading = false;
        },350)
      },
      previewClose(){
        this.$emit('previewClose', false);
        this.keyEventEnable(false);
      },
      documentChange(){
        this.previewInProgress = false;
        this.noPreviewAvailable = false;
        this.isLoading = true;
        this.keyEventEnable(true);

        if(this.documentData){
          if ( this.documentData.previewid ) {
            this.getDocumentPreviewData();
          } else if ( this.documentData.previewEnabledFormat && !this.documentData.previewid ){
            this.showPreviewEnabedFormat();
          } else{
            setTimeout(()=>{
              this.noPreviewAvailable = true;
            },300);
          }
        }
      },
      showPreviewEnabedFormat(){
        let getUrl = window.location.origin + '/dialogs/meet/'+ this.documentData.meetingId + '/document/' + this.documentData.id ;
        this.$http.get( getUrl ).then( response => {
          this.previewImage = response.body;
          this.previewNav.pageCount = 1;
          this.previewNav.currentPage = 0;
        })
      },
      getDocumentPreviewData(){
        let getUrl = window.location.origin + '/document/preview/'+ this.documentData.id;
        this.$http.get( getUrl ).then( response => {
          return response.json();
        }).then( response => {
          // console.log(response);
          if(response.status === 'started' && !response.thumbnails){
            this.previewInProgress = true;
            setTimeout(()=>{
              if(this.previewActive) this.getDocumentPreviewData();
            }, 3500 );
          }else{
            this.previewInProgress = false;
            this.previewThumbnails = response.thumbnails;
            this.previewNav.pageCount = response.thumbnails.length;
            this.previewNav.currentPage = 0;
            this.getTempThumbnail(this.previewThumbnails[this.previewNav.currentPage] );
          }
        })
      },
      getTempThumbnail( _thumbnail){
        let getUrl = window.location.origin + '/document/prevtemp/'+ this.documentData.id;
        this.$http.post( getUrl , {url: _thumbnail.url }).then( response => {
          return response.json();
        }).then(response => {
          this.previewImage = response.data.temporaryUrl;
        })
      },
      changePage( vector ){
        if( ( vector === -1 && this.previewNav.currentPage === 0) || ( vector === 1 && this.previewNav.currentPage + 1 === this.previewNav.pageCount ) ){
          return
        }
        this.pageImgLoading = true;
        this.previewNav.currentPage = this.previewNav.currentPage + vector;
        this.getTempThumbnail( this.previewThumbnails[this.previewNav.currentPage] );
      },
      documentDownload(){
        var fileUrl = window.location.origin + "/dialogs/meet/" + this.documentData.meetingId + "/document/" + this.documentData.id ;
        this.$http.get(fileUrl).then( response => {
          window.open(response.data , '_self' );
        })
      }

    },
    watch: {
      documentData: {
        handler: function(val, oldVal) {
          this.documentChange();
        },
        deep: true
      }
    },
    mounted(){
      // this.previewOpen()
    }
  };
</script>

<style lang="scss" rel="stylesheet/scss">

  .navigation-enter-active, .navigation-leave-active {
    transition: opacity .3s;
  }
  .navigation-enter, .navigation-leave-to /* .fade-leave-active below version 2.1.8 */ {
    opacity: 0;
  }
  .nopreviewpage-enter-active{
    transition: opacity .3s;
  }
  .nopreviewpage-leave-active {
    transition: opacity .0s;
  }
  .nopreviewpage-enter, .nopreviewpage-leave-to /* .fade-leave-active below version 2.1.8 */ {
    opacity: 0;
  }

</style>
