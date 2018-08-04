import React, { Component } from 'react';
import Widget from '@wso2-dashboards/widget';
import './AverageTransactionAmountGraph.css';
import VizG from 'react-vizgrammar';
import _ from 'lodash';

//TODO:: complex equals
//TODO:: legend square
//TODO:: show loading when query changes

class AverageTransactionAmountGraph extends Widget {
    constructor(props) {
        super(props);
        this.state = {
            gData: [],
            dataProviderConf: null,
            metadata: null,
            tableConfig:null,
            width: this.props.glContainer.width,
            height: this.props.glContainer.height,
            isInitialized :false
        };
        this._handleDataReceived = this._handleDataReceived.bind(this);
        this.updateWidgetConf = this.updateWidgetConf.bind(this);
        this.handleResize = this.handleResize.bind(this);
        this.props.glContainer.on('resize', this.handleResize);
        this.setReceivedMsg = this.setReceivedMsg.bind(this);

    }

    componentDidMount() {
      //  super.subscribe(this.setReceivedMsg);
        super.getWidgetConfiguration(this.props.widgetID)
            .then((message) => {
                this.setState({
                    dataProviderConf :  message.data.configs.providerConfig
                });
                super.subscribe(this.setReceivedMsg);
                if (!this.state.isInitialized) {
                    super.publish("init");
                }
            })
            .catch((error) => {
                console.log("error", error);
            });

    }
    _handleDataReceived(data) {
        // console.log(data);

        if (data === -1) {
            this.setState({gData:[]});
        }else {
            this.setState({gData: this.convertDataToInt(data.data)});
        }
    }

    handleResize() {
        this.setState({width: this.props.glContainer.width, height: this.props.glContainer.height});
    }

    setReceivedMsg(receivedMsg) {
        if (receivedMsg === "init") {
            this.defaultFilter();
        }

        this._handleDataReceived(-1);
        this.updateWidgetConf(receivedMsg)
    }

    updateWidgetConf (dTRange){
       // this.setState({ tValue:value });
        let providerConfig = _.cloneDeep(this.state.dataProviderConf);
        let nTableConfig = {
            x: dTRange.type,
            charts: [
                {
                    type: "line",
                    y: "amount(£)",
                    color: "tra",
                    colorScale:["#00FF85","#0085FF"],
                    style:{strokeWidth:2,markRadius:5}
                }
            ],
            append:false,
            legend: true
        };

        let nMetadata = {
            names: [
                dTRange.type,
                "amount(£)",
                "tra"
            ],
            types: [
                "linear",
                "linear",
                "ordinal"
            ]
        };
        this.setState({ tableConfig:nTableConfig,
            metadata:nMetadata});

        providerConfig.configs.config.queryData.query = providerConfig.configs.config.queryData.query.replace(/{{condition}}/g, dTRange.conditionQuery);
        providerConfig.configs.config.queryData.query = providerConfig.configs.config.queryData.query.replace(/{{period}}/g, dTRange.periodQuery);

        // console.log(providerConfig.configs.config.queryData.query);
        super.getWidgetChannelManager().subscribeWidget(this.props.widgetID, this._handleDataReceived, providerConfig);
    };

    convertDataToInt(data){
        for (let i = 0; i < data.length; i++) {
            data[i][0] = parseInt(data[i][0]);
        }

        return data;
    }

    render() {
        return (
            <div className="div-style-atag">
                <br/>
                <VizG
                    config={this.state.tableConfig}
                    metadata={this.state.metadata}
                    data={this.state.gData}
                    height={this.props.glContainer.height - 75}
                    width={this.props.glContainer.width + 100}
                />
            </div>
        );
    }

}

global.dashboard.registerWidget('AverageTransactionAmountGraph', AverageTransactionAmountGraph);

