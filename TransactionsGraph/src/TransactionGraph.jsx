import React, { Component } from 'react';
import Widget from '@wso2-dashboards/widget';
import './TransactionGraph.css';
import VizG from 'react-vizgrammar';
import _ from 'lodash';
import Tabs from '@material-ui/core/Tabs';
import Tab from '@material-ui/core/Tab';
import {MuiThemeProvider, createMuiTheme} from '@material-ui/core/styles';
import JssProvider from 'react-jss/lib/JssProvider';

const darkTheme = createMuiTheme({
    palette: {
        type: "dark"
    }
});

const lightTheme = createMuiTheme({
    palette: {
        type: "light"
    }
});

const QUERY_AMOUNT = "SELECT {{period}} as period, round(sum(amount), 2)  as amount, IF(isSCAApplied =1, 'SCA', 'EXEMPTED') as tra FROM TransactionsHistory WHERE {{condition}} GROUP BY period, isSCAApplied order by period asc, tra desc #";
const QUERY_COUNT = "SELECT {{period}} as period, count(*) as count, IF(isSCAApplied =1, 'SCA', 'EXEMPTED') as tra FROM TransactionsHistory WHERE {{condition}} GROUP BY  period, isSCAApplied order by period asc, tra desc #";

//TODO:: complex equals
//TODO:: legend square
//TODO:: show loading when query changes

class TransactionGraph extends Widget {
    constructor(props) {
        super(props);
        this.state = {
            gData: [],
            tValue: 0,
            dataProviderConf: null,
            metadata: null,
            tableConfig:null,
            width: this.props.glContainer.width,
            height: this.props.glContainer.height,
            isInitialized :false,
            dTRange:null
        }
        ;
        this._handleDataReceived = this._handleDataReceived.bind(this);
        this.handleChange = this.handleChange.bind(this);
        this.handleResize = this.handleResize.bind(this);
        this.setReceivedMsg = this.setReceivedMsg.bind(this);
        this.updateWidgetConf = this.updateWidgetConf.bind(this);
        this.props.glContainer.on('resize', this.handleResize);
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
        console.log(data);

        if (data === -1) {
            this.setState({gData:[]});
        }else {
            this.setState({gData: data.data});
        }
    }

    handleResize() {
        this.setState({width: this.props.glContainer.width, height: this.props.glContainer.height});
    }

    setReceivedMsg(receivedMsg) {
        if (!this.state.isInitialized) {
            this.setState({
                isInitialized :  true
            });
        }
        this.setState({
            dTRange :  receivedMsg
        });
        this._handleDataReceived(-1);
        this.updateWidgetConf(this.state.tValue, receivedMsg);
    }

    handleChange (value){
        this.setState({ tValue:value });
        this.updateWidgetConf(value,this.state.dTRange);
    };

    updateWidgetConf(value, dTRange){
        let providerConfig = _.cloneDeep(this.state.dataProviderConf);
        let yAxis ="";
        if (value === 0) {
            providerConfig.configs.config.queryData.query = QUERY_AMOUNT;
            yAxis = "amount(£)";
        }else {
            providerConfig.configs.config.queryData.query = QUERY_COUNT;
            yAxis = "count";
        }

        let nTableConfig = {
            x: dTRange.type,
            charts: [
                {
                    type: "line",
                    y: yAxis,
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
                yAxis,
                "tra"
            ],
            types: [
                "ordinal",
                "linear",
                "ordinal"
            ]
        };
        this.setState({ tableConfig:nTableConfig,
            metadata:nMetadata});

        providerConfig.configs.config.queryData.query = providerConfig.configs.config.queryData.query.replace(/{{condition}}/g, dTRange.conditionQuery);
        providerConfig.configs.config.queryData.query = providerConfig.configs.config.queryData.query.replace(/{{period}}/g, dTRange.periodQuery);

        console.log(providerConfig.configs.config.queryData.query);
        super.getWidgetChannelManager().subscribeWidget(this.props.widgetID, this._handleDataReceived, providerConfig);
    }

    render() {
        return (
            <div>
                <div className="tab-margins">
                <JssProvider generateClassName={generateClassName}>
                <MuiThemeProvider theme={this.props.muiTheme.name === 'dark' ? darkTheme : lightTheme}>
                <Tabs

                    value={this.state.tValue}
                    indicatorColor="primary"
                    textColor="primary"
                    onChange={(e,v)=>this.handleChange(v)}
                    centered
                >
                    <Tab label="AMOUNT" />
                    <Tab label="COUNT"  />
                </Tabs>
                </MuiThemeProvider>
                </JssProvider>
                </div>
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


//This is the workaround suggested in https://github.com/marmelab/react-admin/issues/1782
const escapeRegex = /([[\].#*$><+~=|^:(),"'`\s])/g;
let classCounter = 0;

export const generateClassName = (rule, styleSheet) => {
    classCounter += 1;

    if (process.env.NODE_ENV === 'production') {
        return `c${classCounter}`;
    }

    if (styleSheet && styleSheet.options.classNamePrefix) {
        let prefix = styleSheet.options.classNamePrefix;
        // Sanitize the string as will be used to prefix the generated class name.
        prefix = prefix.replace(escapeRegex, '-');

        if (prefix.match(/^Mui/)) {
            return `${prefix}-${rule.key}`;
        }

        return `${prefix}-${rule.key}-${classCounter}`;
    }

    return `${rule.key}-${classCounter}`;
};
global.dashboard.registerWidget('TransactionGraph', TransactionGraph);


