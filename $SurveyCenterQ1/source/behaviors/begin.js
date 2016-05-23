var popoverTextMessage;
var SURVEY_TEMPLATE_TYPE = "$SurveyTemplateQ1";
var SURVEY_TYPE = "$SurveyQ1";

//No need to save anything here, so clear save strategy
Facade.Behaviors.App.saveStrategy().candidates().forType("");

//Get list of completed surveys available to this org and put them
//in SurveyList, which will populate dropdowns
Facade.Behaviors.App.preLoad(function() {
    return Facade.Resolver.query(SURVEY_TEMPLATE_TYPE, {
        params: {
            oql: "state='complete'"
        },
        alias: "SurveyList"
    }).then(function(results) {
        Facade.PicklistRegistry.register("SurveyList", new Facade.Prototypes.Picklist(results, {
            getLabel: function(item) {
                return item.getRaw('title')
            },
            getValue: function(item) {
                return item.getRaw('uid')
            }
        }));
    })
});

Facade.Components.Table.forName("NAME").setSortFields(null);

//Initialize an empty list of orgs to assign the survey too and initialize a design with one field, which
//will be a party, to display to the user and allow the user to select a party to assign the survey too
Facade.Behaviors.App.preLoad(function() {
    var partyDesign = Facade.DesignRegistry.register(new Facade.Prototypes.Design(undefined, {
        designType: "PartySelector"
    }))
    partyDesign.addField("myPartyField").setFunctionalType(Facade.Constants.FunctionalType.PARTY);

    Facade.DataRegistry.register("party", new Facade.Prototypes.Data(undefined, { type: 'PartySelector'}));

    Facade.DataRegistry.register("orgAssignList", new Facade.Prototypes.DataList([], undefined));
});

//On select of SurveyList Dropdown
Facade.FunctionRegistry.register("#surveyDropdownAssignTab.onSelect", function(behaviorFn, args) {
    var surveyListDropdown = Facade.PageRegistry.getComponent("surveyDropdownAssignTab")
    var dropdownSelection = surveyListDropdown && surveyListDropdown.getSelectedKey();

    var thisSurvey = Facade.PageRegistry.getPrimaryData();
    thisSurvey.set("surveyID", new Facade.Prototypes.Data({
        data: dropdownSelection
    }));

    //Clear myPartyField if no survey is selected
    if (dropdownSelection == '-1' || dropdownSelection == '' ||
        (!dropdownSelection)) {
        Facade.DataRegistry.get('party').set('myPartyField', undefined);
    }
});

Facade.FunctionRegistry.register("getSurveyTitleAssign", function() {
    var selectedSurvey = Facade.PageRegistry.getComponent("surveyDropdownAssignTab").getSelectedItem();
    if (selectedSurvey) {
        return selectedSurvey.get('title');
    } else {
        Facade.DataRegistry.register('orgAssignList', new Facade.Prototypes.DataList([], undefined));
    }

});

Facade.FunctionRegistry.register("getSurveyTitleResults", function() {
    var selectedSurvey = Facade.PageRegistry.getComponent("surveyDropdownResultTab").getSelectedItem();
    return selectedSurvey ? selectedSurvey.get('title') : undefined;
});

//Can only lookup a party if a survey is selected in dropdown
Facade.Components.Lookup.forName('myPartyLookup').setEditMode(function() {
    var selectedSurvey = Facade.PageRegistry.getComponent("surveyDropdownAssignTab").getSelectedItem();
    return selectedSurvey ? true : false;
})

//Assign survey button enabled if there are orgs in the orgAssignList
Facade.Components.Button.forName('assignSurveyButton').setEnabled(function() {
    var assignListLength = Facade.DataRegistry.get('orgAssignList').getLength();
    return assignListLength > 0 ? true : false;
});


//Returns name of org to a core-text to display selected orgs to user
Facade.FunctionRegistry.register('getOrgInfo', function() {
    return this.getPathData().get('name');
});

Facade.Components.Field.forName('myPartyLookup').party().partyLookup().setOnLookup(function(behaviorFn,args){
    var selectedParty = this.getSelectionSet().getSelection();
    var partyId = selectedParty && selectedParty.get('memberId');
    var partyName = selectedParty && selectedParty.get('name');
    var org = new Facade.Prototypes.Data({
        memberId: partyId,
        name: partyName
    });
    Facade.DataRegistry.get('orgAssignList').pushResult(org);

    //Clear the field
    this.getButtonbar().getButton('deleteButton').$click();
});


Facade.Components.Section.forName("assignTabBoldLine").setMask( function(){
    var assignListLength = Facade.DataRegistry.get('orgAssignList').getLength();
    return assignListLength > 0 ? Facade.Constants.Mask.NORMAL : Facade.Constants.Mask.HIDDEN;
});

//Assemble payload then send out API post calls to assign selected survey to selected
//orgs. Each party selected gets its own instance created and tasked to it on created of the CORT
Facade.Components.Button.forName('assignSurveyButton').setOnClick(function(behaviorFn, args) {
    var selectedSurvey = Facade.PageRegistry.getComponent('surveyDropdownAssignTab');
    var surveyID = selectedSurvey.getSelectedKey();
    var name = selectedSurvey.getSelectedItem().get('title');
    var assignList = Facade.DataRegistry.get('orgAssignList').getResults();
    var surveys = Facade.DataRegistry.get('SurveyList');
    var len = assignList.length;
    for (var i = 0; i < len; i++) {
        var assignOrg = {
            "memberId": assignList[i].get('memberId')
        }
        var payload = {
            "name": name,
            "surveyID": surveyID,
            "assignee": assignOrg,
            "type": SURVEY_TYPE
        }
        var list = []
        var sLen = surveys.getLength();
        for (var j = 0; j < sLen; j++) {
            if (surveyID == surveys.get(j).get('uid')) {
                var questionList = surveys.get(j).get('questionList');
                list = copyQuestionListToResponseList( questionList );
            }
        }
        //Must be a better way to do this below !!

        payload.responseList = list;
        //On last Survey, alert user that process has completed and reset data on callback
        //using .then method
        if (i == (len - 1)) {
            //Create new Survey
            Facade.API.flush(SURVEY_TYPE, null, new Facade.Prototypes.Data(payload))
                .then(function() {
                    Facade.PageRegistry.alert("Successfully assigned surveys!")
                    Facade.DataRegistry.get('party').set('myPartyField', undefined);
                    Facade.DataRegistry.register('orgAssignList', new Facade.Prototypes.DataList([], undefined));
                }, function() {
                    Facade.PageRegistry.alert("Error assigning surveys. Check connection or contact GTNexus")
                })
            break;
        }
        //Create new survey
        Facade.API.flush(SURVEY_TYPE, null, new Facade.Prototypes.Data(payload))
    }

});
Facade.FunctionRegistry.register("getPopoverMessage", function() {
    return popoverTextMessage;
});

//On click of remove org button, remove the org from the DataRegistry
Facade.FunctionRegistry.register('removePath', function() {
    var idToRemove = this.getPathData().get('memberId');
    var nameToRemove = this.getPathData().get('name');
    var orgsList = Facade.DataRegistry.get('orgAssignList');
    var len = orgsList.getLength();
    for (var i = 0; i < len; i++) {
        if (idToRemove == orgsList.get(i).get('memberId') &&
            nameToRemove == orgsList.get(i).get('name')) {
            orgsList.removeResult(i);
            break;
        }
    }
});
//
Facade.FunctionRegistry.register('orgSelected', function() {
    if (Facade.DataRegistry.get('orgAssignList').getLength() > 0) {
        return Facade.Constants.Mask.NORMAL;
    }
    return Facade.Constants.Mask.HIDDEN;
});

//Results Tab
/////////////////////////////////////////////////////////////////////////////////////////



//Hide table if no item has been selected from survey dropdown
Facade.FunctionRegistry.register("table.results.mask", function() {
    var dropdown = Facade.PageRegistry.getComponent("surveyDropdownResultTab");
    return ( dropdown.getSelectedKey() && dropdown.getSelectedKey() != "-1" )
                    ? Facade.Constants.Mask.NORMAL : Facade.Constants.Mask.HIDDEN;
});

//On selection of a survey from dropdown, retrieve all surveys that have been derived from
//selected SurveyTemplate

Facade.Components.Dropdown.forName('surveyDropdownResultTab').setOnSelect(function(behaviorFn,args){
    var selectedSurvey = this.getSelectedItem();
    if (selectedSurvey) {
        var surveyID = this.getSelectedItem().get('uid');
        var oqlStatement = "surveyID = " + surveyID + "";
        //Query for all surveys with that ID
        Facade.DataRegistry.register('getResults' ,
            new Facade.Prototypes.ResolverData(undefined, {
                type : SURVEY_TYPE ,
                isList : true ,
                resolver : function(resolverOptions){
                    return Facade.Resolver.query(SURVEY_TYPE , {
                        params : { oql : oqlStatement}
                    })
                }
            }))
    }
});

//Set a link within the table for each survey
Facade.Components.Link.forKind("surveyLink").setLink(function() {
    var surveyUid = this.getPathData().getParentPathData().get('uid');
    return new Facade.Prototypes.Link(SURVEY_TYPE + "?key=" + surveyUid).setLabel('Go To Survey');
});

function copyQuestionListToResponseList( qList ){
    var aLen = qList.getLength();
    var responseList = [];
    for( var i = 0; i < aLen; i++) {
        var questionObj = {
            "questionText" : qList.get(i).get('questionText') ,
            "questionType" : qList.get(i).get('questionType')
        };
        var optsList = [];
        var options = qList.get(i).get('answerOptions');
        var oLen = options && options.getLength();
        for( var k = 0; k < oLen; k++){
            optsList.push( { "answerText" : options.get(k).get('answerText')} );
        }
        questionObj.answerOptions = optsList;
        responseList.push( questionObj );
    }
    return responseList;
}